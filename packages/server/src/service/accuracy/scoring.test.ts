import type { ClaimResult } from 'src/entities';
import { describe, expect, it } from 'vitest';
import { countVerdicts } from './scoring';

function claim(verdict: ClaimResult['verdict'], source?: string): ClaimResult {
  return {
    messageIndex: 0,
    text: 'x',
    verdict,
    confidence: 1,
    explanation: 'x',
    evidence: source ? { source, quote: 'q' } : null,
  };
}

describe('countVerdicts', () => {
  it('counts every verdict, including zeros', () => {
    expect(countVerdicts([claim('supported'), claim('supported'), claim('contradicted')])).toEqual({
      supported: 2,
      contradicted: 1,
      unsupported: 0,
      not_verifiable: 0,
    });
  });
});
