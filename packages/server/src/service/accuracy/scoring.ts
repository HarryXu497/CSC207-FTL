import type { AccuracyVerdict, ClaimResult } from '@recall/shared';

/** How much of a full point each verdict earns. Not-verifiable claims are left out entirely. */
const VERDICT_VALUE: Record<Exclude<AccuracyVerdict, 'not_verifiable'>, number> = {
  supported: 1,
  // The knowledge base is silent: probably fine, but nothing backs it. Half credit.
  unsupported: 0.5,
  contradicted: 0,
};

/** A claim backed by a required document counts double: getting those facts right matters most. */
const REQUIRED_DOCUMENT_WEIGHT = 2;

export function countVerdicts(claims: ClaimResult[]): Record<AccuracyVerdict, number> {
  const counts: Record<AccuracyVerdict, number> = {
    supported: 0,
    contradicted: 0,
    unsupported: 0,
    not_verifiable: 0,
  };
  for (const claim of claims) {
    counts[claim.verdict]++;
  }
  return counts;
}

/**
 * Weighted average of verdict values, scaled to 0-100 and rounded. Null when no claim was
 * checkable, because "nothing to score" is not the same as a score of zero.
 */
export function computeScore(
  claims: ClaimResult[],
  requiredSources: ReadonlySet<string>,
): number | null {
  let earned = 0;
  let possible = 0;

  for (const claim of claims) {
    if (claim.verdict === 'not_verifiable') continue;

    const weight =
      claim.evidence && requiredSources.has(claim.evidence.source) ? REQUIRED_DOCUMENT_WEIGHT : 1;
    earned += weight * VERDICT_VALUE[claim.verdict];
    possible += weight;
  }

  return possible === 0 ? null : Math.round((earned / possible) * 100);
}
