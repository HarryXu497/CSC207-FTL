/**
 * Accuracy metric: how well what the agent said agrees with the knowledge base (RAG documents).
 */

/**
 * How one agent claim relates to the retrieved knowledge-base evidence.
 * - supported:      the evidence confirms the claim
 * - contradicted:   the evidence says something different
 * - unsupported:    the knowledge base neither confirms nor contradicts it
 * - not_verifiable: not a checkable statement (greeting, opinion, ...) or it could not be judged
 */
export type AccuracyVerdict = 'supported' | 'contradicted' | 'unsupported' | 'not_verifiable';

/**
 * - required:    the agent must state this document's content correctly to resolve the customer's
 *                issue; claims backed by it weigh more in the score.
 * - recommended: relevant and useful, but the issue can be resolved without it. Never affects score.
 */
export type DocumentRole = 'required' | 'recommended';

/** The passage that a verdict is based on. */
export interface ClaimEvidence {
  /** Originating document, i.e. the `source` metadata of the chunk. */
  source: string;
  /** Verbatim passage from the document. */
  quote: string;
}

/** The verdict for one factual statement the agent made. */
export interface ClaimResult {
  /** Index of the agent message in the transcript the claim came from. */
  messageIndex: number;
  /** The claim, restated so it stands on its own. */
  text: string;
  verdict: AccuracyVerdict;
  /** Judge confidence in the verdict, 0 to 1. */
  confidence: number;
  explanation: string;
  /** Present only when the quote was found verbatim in a retrieved chunk. */
  evidence: ClaimEvidence | null;
}

/** A knowledge-base document that matters for this call. */
export interface DocumentFinding {
  source: string;
  /** Why this document matters for the call. */
  reason: string;
  /** Whether at least one agent claim was supported or contradicted by this document. */
  usedByAgent: boolean;
}

export interface AccuracyDocuments {
  required: DocumentFinding[];
  recommended: DocumentFinding[];
}

/** Accuracy result for one call. */
export interface Accuracy {
  /** 0 to 100, or null when the agent made no checkable claims (so there is nothing to score). */
  score: number | null;
  counts: Record<AccuracyVerdict, number>;
  claims: ClaimResult[];
  documents: AccuracyDocuments;
  /** True when the call had more agent claims than the analysis limit, so some were skipped. */
  claimsTruncated: boolean;
  /** Version of the prompts used, so results can be compared across prompt changes. */
  promptVersion: string;
  /** ISO 8601 timestamp. */
  analyzedAt: string;
}
