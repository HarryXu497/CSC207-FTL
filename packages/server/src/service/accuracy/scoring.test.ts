import type { ClaimResult } from '@recall/shared';
import { describe, expect, it } from 'vitest';
import { computeScore, countVerdicts } from './scoring';

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

describe('computeScore', () => {
  const none = new Set<string>();

  it('is null when nothing was checkable, not zero', () => {
    expect(computeScore([], none)).toBeNull();
    expect(computeScore([claim('not_verifiable')], none)).toBeNull();
  });

  it('gives full, half and no credit for supported, unsupported and contradicted', () => {
    expect(computeScore([claim('supported')], none)).toBe(100);
    expect(computeScore([claim('unsupported')], none)).toBe(50);
    expect(computeScore([claim('contradicted')], none)).toBe(0);
  });

  it('ignores not-verifiable claims', () => {
    expect(computeScore([claim('supported'), claim('not_verifiable')], none)).toBe(100);
  });

  it('weights claims backed by a required document double', () => {
    const claims = [claim('supported'), claim('contradicted', 'policy.md')];
    expect(computeScore(claims, none)).toBe(50);
    // supported = 1 point of 3 possible once the contradicted claim counts double
    expect(computeScore(claims, new Set(['policy.md']))).toBe(33);
  });
});

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
