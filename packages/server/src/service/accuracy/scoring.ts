import type { AccuracyVerdict, ClaimResult } from 'src/entities';

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
