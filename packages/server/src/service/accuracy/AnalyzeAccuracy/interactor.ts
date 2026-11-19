/**
 * Computes the accuracy metric for a call transcript.
 *
 *  1. extract    LLM lists the checkable claims the agent made
 *  2. retrieve   RAG fetches knowledge-base chunks for each claim
 *  3. judge      LLM rules on each claim using only those chunks; quotes are verified in code
 *  4. classify   LLM sorts the retrieved documents into required / recommended for this call
 *  5. score      plain code turns verdicts into a 0-100 score
 */
import {
  computeScore,
  countVerdicts,
  type Accuracy,
  type AccuracyDocuments,
  type ClaimResult,
  type Document,
  type TranscriptMessage,
} from 'src/entities';
import { LlmOutputError } from 'src/errors';
import { completeJson, type LlmClient, type Retriever } from 'src/repository';
import { mapLimit } from './concurrency';
import { quoteAppearsIn, sourceOf } from './evidence';
import type { AnalyzeAccuracyInputBoundary, AnalyzeAccuracyInputData } from './input';
import type { AnalyzeAccuracyOutputBoundary } from './output';
import {
  PROMPT_VERSION,
  classifyDocumentsPrompt,
  extractClaimsPrompt,
  judgeClaimPrompt,
  type DocumentCandidate,
} from './prompts';
import { classificationSchema, extractionSchema, judgmentSchema } from './schemas';

export interface AnalyzeAccuracyOptions {
  maxClaims: number;
  chunksPerClaim: number;
  /** Customer messages searched for documents the agent should have used. */
  maxQuestions: number;
  chunksPerQuestion: number;
  concurrency: number;
  /** Characters of each document shown to the classifier. */
  excerptLength: number;
}

export const DEFAULT_ACCURACY_OPTIONS: AnalyzeAccuracyOptions = {
  maxClaims: 20,
  chunksPerClaim: 4,
  maxQuestions: 5,
  chunksPerQuestion: 3,
  concurrency: 4,
  excerptLength: 600,
};

interface Claim {
  messageIndex: number;
  text: string;
}

export class AnalyzeAccuracyInteractor implements AnalyzeAccuracyInputBoundary {
  private readonly options: AnalyzeAccuracyOptions;

  constructor(
    private readonly llm: LlmClient,
    private readonly retriever: Retriever,
    options: Partial<AnalyzeAccuracyOptions> = {},
    private readonly now: () => Date = () => new Date(),
  ) {
    this.options = { ...DEFAULT_ACCURACY_OPTIONS, ...options };
  }

  async handle(
    input: AnalyzeAccuracyInputData,
    presenter: AnalyzeAccuracyOutputBoundary,
  ): Promise<void> {
    let accuracy: Accuracy;

    try {
      accuracy = await this.analyze(input);
    } catch (error) {
      if (error instanceof LlmOutputError) {
        presenter.presentModelFailure();
        return;
      }
      throw error;
    }

    presenter.present({ accuracy });
  }

  private async analyze({ messages, topic }: AnalyzeAccuracyInputData): Promise<Accuracy> {
    const { claims, truncated } = await this.extractClaims(messages, topic);

    // Documents found for the claims and for the customer's questions; the questions are how we
    // find required documents the agent never used.
    const candidates = new Map<string, DocumentCandidate>();
    const results = await mapLimit(claims, this.options.concurrency, (claim) =>
      this.judgeClaim(claim, messages, candidates),
    );
    await this.collectQuestionDocuments(messages, candidates);

    const documents = await this.classifyDocuments(messages, candidates, results, topic);
    const requiredSources = new Set(documents.required.map((d) => d.source));

    return {
      score: computeScore(results, requiredSources),
      counts: countVerdicts(results),
      claims: results,
      documents,
      claimsTruncated: truncated,
      promptVersion: PROMPT_VERSION,
      analyzedAt: this.now().toISOString(),
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
    const customerContext = lastCustomerMessageBefore(messages, claim.messageIndex);
    const query = customerContext ? `${customerContext}\n${claim.text}` : claim.text;
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
          customerContext,
          chunks.map((c) => c.content),
        ),
        judgmentSchema,
      );

      if (judgment.verdict !== 'supported' && judgment.verdict !== 'contradicted') {
        return { ...base, ...pick(judgment), evidence: null };
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

      return {
        ...base,
        ...pick(judgment),
        evidence: { source: sourceOf(chunk), quote: judgment.quote },
      };
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

    const used = new Set(
      results
        .filter((r) => r.evidence && (r.verdict === 'supported' || r.verdict === 'contradicted'))
        .map((r) => (r.evidence as { source: string }).source),
    );

    const seen = new Set<string>();
    for (const doc of reply.documents) {
      // Skip sources the model made up, and repeats.
      if (!candidates.has(doc.source) || seen.has(doc.source) || doc.role === 'irrelevant')
        continue;
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

function pick(j: { verdict: ClaimResult['verdict']; confidence: number; explanation: string }) {
  return { verdict: j.verdict, confidence: j.confidence, explanation: j.explanation };
}
