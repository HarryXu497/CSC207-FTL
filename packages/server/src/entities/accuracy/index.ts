import type { Message } from '../database';

/** One transcript turn: who spoke and what they said. */
export type TranscriptMessage = Pick<Message, 'role' | 'content'>;

/**
 * How a claim relates to the knowledge base.
 * - supported:      the documents confirm it
 * - contradicted:   the documents say something different
 * - unsupported:    the documents neither confirm nor contradict it
 * - not_verifiable: not a checkable fact, or it could not be judged
 */
export type AccuracyVerdict = 'supported' | 'contradicted' | 'unsupported' | 'not_verifiable';

/**
 * - required:    the agent needed this document to resolve the issue; claims backed by it weigh double
 * - recommended: useful, but not needed; never affects the score
 */
export type DocumentRole = 'required' | 'recommended';

export interface ClaimEvidence {
  /** File the chunk came from. */
  source: string;
  /** Passage quoted from the document. */
  quote: string;
}

/** The verdict for one factual statement the agent made. */
export interface ClaimResult {
  /** Index of the agent message the claim came from. */
  messageIndex: number;
  text: string;
  verdict: AccuracyVerdict;
  /** 0 to 1. */
  confidence: number;
  explanation: string;
  /** Null unless the quote was found in a retrieved chunk. */
  evidence: ClaimEvidence | null;
}

export interface DocumentFinding {
  source: string;
  reason: string;
  /** Whether any agent claim was supported or contradicted by this document. */
  usedByAgent: boolean;
}

export type AccuracyDocuments = Record<DocumentRole, DocumentFinding[]>;

export interface Accuracy {
  /** 0 to 100, or null when the agent made no checkable claims. */
  score: number | null;
  counts: Record<AccuracyVerdict, number>;
  claims: ClaimResult[];
  documents: AccuracyDocuments;
  /** True when some claims were skipped because of the claim limit. */
  claimsTruncated: boolean;
  promptVersion: string;
  /** ISO 8601 timestamp. */
  analyzedAt: string;
}

export * from './scoring';
