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
