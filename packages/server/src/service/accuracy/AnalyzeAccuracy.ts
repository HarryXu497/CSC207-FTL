/**
 * Computes the accuracy metric for a call transcript.
 *
 *  1. extract    LLM lists the checkable claims the agent made
 *  2. retrieve   RAG fetches knowledge-base chunks for each claim
 *  3. judge      LLM rules on each claim using only those chunks; quotes are verified in code
 *  4. classify   LLM sorts the retrieved documents into required / recommended for this call
 *  5. score      plain code turns verdicts into a 0-100 score
 *
 * The LLM never computes the score, so it is explainable and cannot drift.
 */
import type {
  Accuracy,
  AccuracyDocuments,
  AnalyzeAccuracyRequest,
  ClaimResult,
  DocumentFinding,
  Message,
} from '@recall/shared';
import type { LlmClient } from 'src/repository';
import { mapLimit } from './concurrency';
import type { Document, EvidenceRetriever } from './EvidenceRetriever';
import { quoteAppearsIn, sourceOf } from './evidence';
import { completeJson } from './llmJson';
import {
  PROMPT_VERSION,
  classifyDocumentsPrompt,
  extractClaimsPrompt,
  judgeClaimPrompt,
  type DocumentCandidate,
} from './prompts';
import { classificationSchema, extractionSchema, judgmentSchema } from './schemas';
import { computeScore, countVerdicts } from './scoring';

export interface AnalyzeAccuracyOptions {
  /** Most claims judged per call; keeps cost and latency bounded. */
  maxClaims: number;
  /** Chunks retrieved per claim. */
  chunksPerClaim: number;
  /** Most customer messages used to look for documents the agent should have used. */
  maxQuestions: number;
  /** Chunks retrieved per customer message. */
  chunksPerQuestion: number;
  /** Concurrent LLM/retrieval calls. */
  concurrency: number;
  /** Characters of each document shown to the document classifier. */
  excerptLength: number;
}

export const DEFAULT_OPTIONS: AnalyzeAccuracyOptions = {
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

export class AnalyzeAccuracy {
  private readonly options: AnalyzeAccuracyOptions;

  constructor(
    private readonly llm: LlmClient,
    private readonly retriever: EvidenceRetriever,
    options: Partial<AnalyzeAccuracyOptions> = {},
    private readonly now: () => Date = () => new Date(),
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async handle({ messages, topic }: AnalyzeAccuracyRequest): Promise<Accuracy> {
    const { claims, truncated } = await this.extractClaims(messages, topic);

    // Candidate documents: everything retrieved for a claim, plus what the customer's own
    // questions point to (this is how we notice required documents the agent never used).
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

  private async extractClaims(messages: Message[], topic?: string) {
    if (!messages.some((m) => m.speaker === 'agent')) {
      return { claims: [] as Claim[], truncated: false };
    }

    const reply = await completeJson(
      this.llm,
      extractClaimsPrompt(messages, topic),
      extractionSchema,
    );

    // Trust but verify: keep only claims attributed to a real agent message, without repeats.
    const seen = new Set<string>();
    const valid = reply.claims.filter((c) => {
      const key = `${c.messageIndex}:${c.text.toLowerCase()}`;
      if (messages[c.messageIndex]?.speaker !== 'agent' || seen.has(key)) return false;
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
    messages: Message[],
    candidates: Map<string, DocumentCandidate>,
  ): Promise<ClaimResult> {
    const customerContext = lastCustomerMessageBefore(messages, claim.messageIndex);
    const query = customerContext ? `${customerContext}\n${claim.text}` : claim.text;
    const chunks = await this.retriever.search(query, this.options.chunksPerClaim);
    this.addCandidates(candidates, chunks);

    const base = { messageIndex: claim.messageIndex, text: claim.text };

    // Nothing retrieved means nothing to judge against; skip the LLM call.
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

      // A supported/contradicted ruling must be backed by a real quote from the cited chunk.
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
      // One unjudgeable claim must not sink the whole call; say so and leave it out of the score.
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
    messages: Message[],
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
    messages: Message[],
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

    // A document counts as used only when the agent made a claim that it actually decided.
    const used = new Set(
      results
        .filter((r) => r.evidence && (r.verdict === 'supported' || r.verdict === 'contradicted'))
        .map((r) => (r.evidence as { source: string }).source),
    );

    const seen = new Set<string>();
    for (const doc of reply.documents) {
      // Ignore sources the model made up, and repeats.
      if (!candidates.has(doc.source) || seen.has(doc.source) || doc.role === 'irrelevant')
        continue;
      seen.add(doc.source);

      const finding: DocumentFinding = {
        source: doc.source,
        reason: doc.reason,
        usedByAgent: used.has(doc.source),
      };
      documents[doc.role].push(finding);
    }

    return documents;
  }
}

function customerTexts(messages: Message[]): string[] {
  return messages.filter((m) => m.speaker === 'customer').map((m) => m.text);
}

function lastCustomerMessageBefore(messages: Message[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]?.speaker === 'customer') return messages[i]?.text ?? null;
  }
  return null;
}

function pick(j: { verdict: ClaimResult['verdict']; confidence: number; explanation: string }) {
  return { verdict: j.verdict, confidence: j.confidence, explanation: j.explanation };
}
