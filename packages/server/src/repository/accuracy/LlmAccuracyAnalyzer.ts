import type {
  AccuracyDocuments,
  AccuracyFindings,
  Claim,
  ClaimResult,
  Document,
  TranscriptMessage,
} from 'src/entities';
import { completeJson, type LlmClient } from '../llm';
import type { Retriever } from '../rag';
import type { AccuracyAnalyzer } from './AccuracyAnalyzer';
import { mapLimit } from './concurrency';
import { quoteAppearsIn, sourceOf } from './evidence';
import {
  PROMPT_VERSION,
  classifyDocumentsPrompt,
  extractClaimsPrompt,
  judgeClaimPrompt,
  type DocumentCandidate,
} from './prompts';
import { classificationSchema, extractionSchema, judgmentSchema } from './schemas';

export interface AccuracyAnalyzerOptions {
  maxClaims: number;
  chunksPerClaim: number;
  /** Customer messages searched for documents the agent should have used. */
  maxQuestions: number;
  chunksPerQuestion: number;
  concurrency: number;
  /** Characters of each document shown to the classifier. */
  excerptLength: number;
}

export const DEFAULT_ACCURACY_ANALYZER_OPTIONS: AccuracyAnalyzerOptions = {
  maxClaims: 20,
  chunksPerClaim: 4,
  maxQuestions: 5,
  chunksPerQuestion: 3,
  concurrency: 4,
  excerptLength: 600,
};

/**
 * Checks what the agent said against the knowledge base, using RAG to find the evidence:
 *  1. extract   the LLM lists the checkable claims the agent made
 *  2. retrieve  the retriever finds knowledge-base chunks for each claim and customer question
 *  3. judge     the LLM rules on each claim using only those chunks; its quotes are verified in code
 *  4. classify  the LLM sorts the retrieved documents into required and recommended
 */
export class LlmAccuracyAnalyzer implements AccuracyAnalyzer {
  private readonly options: AccuracyAnalyzerOptions;

  constructor(
    private readonly llm: LlmClient,
    private readonly retriever: Retriever,
    options: Partial<AccuracyAnalyzerOptions> = {},
  ) {
    this.options = { ...DEFAULT_ACCURACY_ANALYZER_OPTIONS, ...options };
  }

  async analyze(messages: TranscriptMessage[], topic?: string): Promise<AccuracyFindings> {
    const { claims, truncated } = await this.extractClaims(messages, topic);

    const candidates = new Map<string, DocumentCandidate>();
    const results = await mapLimit(claims, this.options.concurrency, (claim) =>
      this.judgeClaim(claim, messages, candidates),
    );
    // Searching the customer's questions finds required documents the agent never used.
    await this.collectQuestionDocuments(messages, candidates);

    return {
      claims: results,
      documents: await this.classifyDocuments(messages, candidates, results, topic),
      claimsTruncated: truncated,
      promptVersion: PROMPT_VERSION,
    };
  }

  private async extractClaims(messages: TranscriptMessage[], topic?: string) {
    if (!messages.some((m) => m.role === 'agent')) {
      return { claims: [] as Claim[], truncated: false };
    }

    const reply = await completeJson(
      this.llm,
      extractClaimsPrompt(messages, topic),
      extractionSchema,
    );

    // The model can misattribute claims: keep only those from a real agent message, without repeats.
    const seen = new Set<string>();
    const valid = reply.claims.filter((c) => {
      const key = `${c.messageIndex}:${c.text.toLowerCase()}`;
      if (messages[c.messageIndex]?.role !== 'agent' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      claims: valid.slice(0, this.options.maxClaims),
      truncated: valid.length > this.options.maxClaims,
    };
  }

  private async judgeClaim(
    claim: Claim,
    messages: TranscriptMessage[],
    candidates: Map<string, DocumentCandidate>,
  ): Promise<ClaimResult> {
    const question = lastCustomerMessageBefore(messages, claim.messageIndex);
    const query = question ? `${question}\n${claim.text}` : claim.text;
    const chunks = await this.retriever.search(query, this.options.chunksPerClaim);
    this.addCandidates(candidates, chunks);

    const base = { messageIndex: claim.messageIndex, text: claim.text };

    if (chunks.length === 0) {
      return {
        ...base,
        verdict: 'unsupported',
        confidence: 1,
        explanation: 'No relevant documents were found in the knowledge base.',
        evidence: null,
      };
    }

    try {
      const judgment = await completeJson(
        this.llm,
        judgeClaimPrompt(
          claim.text,
          question,
          chunks.map((c) => c.content),
        ),
        judgmentSchema,
      );
      const verdict = {
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        explanation: judgment.explanation,
      };

      if (verdict.verdict !== 'supported' && verdict.verdict !== 'contradicted') {
        return { ...base, ...verdict, evidence: null };
      }

      // The model can invent quotes: only trust a verdict whose quote is really in the chunk.
      const chunk = judgment.evidenceChunk ? chunks[judgment.evidenceChunk - 1] : undefined;
      if (!chunk || !judgment.quote || !quoteAppearsIn(judgment.quote, chunk.content)) {
        return {
          ...base,
          verdict: 'unsupported',
          confidence: judgment.confidence,
          explanation: `${judgment.explanation} (Downgraded: the quoted evidence could not be found in the retrieved documents.)`,
          evidence: null,
        };
      }

      return { ...base, ...verdict, evidence: { source: sourceOf(chunk), quote: judgment.quote } };
    } catch (error) {
      // One unjudgeable claim should not fail the whole analysis; it is left out of the score.
      const reason = error instanceof Error ? error.message : String(error);
      return {
        ...base,
        verdict: 'not_verifiable',
        confidence: 0,
        explanation: `This claim could not be evaluated: ${reason}`,
        evidence: null,
      };
    }
  }

  private async collectQuestionDocuments(
    messages: TranscriptMessage[],
    candidates: Map<string, DocumentCandidate>,
  ) {
    const questions = customerTexts(messages).slice(0, this.options.maxQuestions);
    const found = await mapLimit(questions, this.options.concurrency, (q) =>
      this.retriever.search(q, this.options.chunksPerQuestion),
    );
    for (const chunks of found) {
      this.addCandidates(candidates, chunks);
    }
  }

  private addCandidates(candidates: Map<string, DocumentCandidate>, chunks: Document[]) {
    for (const chunk of chunks) {
      const source = sourceOf(chunk);
      if (!candidates.has(source)) {
        candidates.set(source, {
          source,
          excerpt: chunk.content.slice(0, this.options.excerptLength),
        });
      }
    }
  }

  private async classifyDocuments(
    messages: TranscriptMessage[],
    candidates: Map<string, DocumentCandidate>,
    results: ClaimResult[],
    topic?: string,
  ): Promise<AccuracyDocuments> {
    const documents: AccuracyDocuments = { required: [], recommended: [] };
    if (candidates.size === 0) {
      return documents;
    }

    const reply = await completeJson(
      this.llm,
      classifyDocumentsPrompt(customerTexts(messages), [...candidates.values()], topic),
      classificationSchema,
    );

    const used = new Set(results.flatMap((r) => (r.evidence ? [r.evidence.source] : [])));
    const seen = new Set<string>();

    for (const doc of reply.documents) {
      // Skip sources the model made up, and repeats.
      if (!candidates.has(doc.source) || seen.has(doc.source) || doc.role === 'irrelevant') {
        continue;
      }
      seen.add(doc.source);

      documents[doc.role].push({
        source: doc.source,
        reason: doc.reason,
        usedByAgent: used.has(doc.source),
      });
    }

    return documents;
  }
}

function customerTexts(messages: TranscriptMessage[]): string[] {
  return messages.filter((m) => m.role === 'customer').map((m) => m.content);
}

function lastCustomerMessageBefore(messages: TranscriptMessage[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]?.role === 'customer') return messages[i]?.content ?? null;
  }
  return null;
}
