import type { Message } from '../database';

export type TranscriptMessage = Pick<Message, 'role' | 'content'>;

export type AccuracyVerdict = 'supported' | 'contradicted' | 'unsupported' | 'not_verifiable';

/** Claims backed by a required document weigh double; recommended ones never change the score. */
export type DocumentRole = 'required' | 'recommended';

/** A checkable statement the agent made, before it is judged. */
export interface Claim {
  messageIndex: number;
  text: string;
}

export interface ClaimEvidence {
  source: string;
  quote: string;
}

export interface ClaimResult extends Claim {
  /** Persisted source message ID; absent on legacy or unstored transcript results. */
  messageId?: string;
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
  /** True when at least one claim was supported or contradicted by this document. */
  usedByAgent: boolean;
}

export type AccuracyDocuments = Record<DocumentRole, DocumentFinding[]>;

/** What the analysis finds in a transcript, before it is scored. */
export interface AccuracyFindings {
  claims: ClaimResult[];
  documents: AccuracyDocuments;
  /** True when claims past the limit were skipped. */
  claimsTruncated: boolean;
  promptVersion: string;
}

export interface Accuracy extends AccuracyFindings {
  /** IDs of the analyzed stored transcript, in order; absent on legacy results. */
  messageIds?: string[];
  /** 0 to 100, or null when no claim was checkable. */
  score: number | null;
  counts: Record<AccuracyVerdict, number>;
  /** ISO 8601 timestamp. */
  analyzedAt: string;
}

export * from './scoring';
