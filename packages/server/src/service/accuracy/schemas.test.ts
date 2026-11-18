import { describe, expect, it } from 'vitest';
import { classificationSchema, extractionSchema, judgmentSchema } from './schemas';

describe('LLM reply schemas', () => {
  it('accepts a well-formed claim extraction and rejects a negative message index', () => {
    expect(extractionSchema.safeParse({ claims: [{ messageIndex: 1, text: 'x' }] }).success).toBe(
      true,
    );
    expect(extractionSchema.safeParse({ claims: [{ messageIndex: -1, text: 'x' }] }).success).toBe(
      false,
    );
  });

  it('rejects a judgment with an unknown verdict or a confidence outside 0 to 1', () => {
    const ok = {
      verdict: 'supported',
      confidence: 1,
      evidenceChunk: 1,
      quote: 'q',
      explanation: 'e',
    };
    expect(judgmentSchema.safeParse(ok).success).toBe(true);
    expect(judgmentSchema.safeParse({ ...ok, verdict: 'maybe' }).success).toBe(false);
    expect(judgmentSchema.safeParse({ ...ok, confidence: 2 }).success).toBe(false);
  });

  it('allows an irrelevant document role in a classification', () => {
    const reply = { documents: [{ source: 'a.md', role: 'irrelevant', reason: 'r' }] };
    expect(classificationSchema.safeParse(reply).success).toBe(true);
  });
});
