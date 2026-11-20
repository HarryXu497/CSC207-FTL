import type { AccuracyVerdict, ClaimResult } from './index';

const VERDICT_CREDIT: Record<Exclude<AccuracyVerdict, 'not_verifiable'>, number> = {
  supported: 1,
  unsupported: 0.5,
  contradicted: 0,
};

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
 * Weighted average of the verdict credits, from 0 to 100. Null when no claim was checkable, since
 * that is not the same as a score of 0.
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
    earned += weight * VERDICT_CREDIT[claim.verdict];
    possible += weight;
  }

  return possible === 0 ? null : Math.round((earned / possible) * 100);
}
