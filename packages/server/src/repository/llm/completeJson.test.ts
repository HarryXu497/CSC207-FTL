import { LlmOutputError } from 'src/errors';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { completeJson, extractJson } from './completeJson';
import type { LlmClient } from './LlmClient';

const schema = z.object({ ok: z.boolean() });

/** Gives the replies in order, then keeps repeating the last one. */
function llmReplying(...replies: string[]): LlmClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async complete(req) {
      calls.push(req.user);
      return replies[Math.min(calls.length - 1, replies.length - 1)] as string;
    },
  };
}

describe('extractJson', () => {
  it('reads JSON wrapped in prose and code fences', () => {
    expect(extractJson('Sure!\n```json\n{"ok": true}\n```')).toEqual({ ok: true });
  });
});

describe('completeJson', () => {
  it('retries once, telling the model what was wrong', async () => {
    const llm = llmReplying('{"ok": "yes"}', '{"ok": true}');
    expect(await completeJson(llm, { system: 's', user: 'u' }, schema)).toEqual({ ok: true });
    expect(llm.calls[1]).toContain('was rejected');
  });

  it('throws LlmOutputError after the attempts run out', async () => {
    const llm = llmReplying('garbage');
    await expect(completeJson(llm, { system: 's', user: 'u' }, schema)).rejects.toBeInstanceOf(
      LlmOutputError,
    );
    expect(llm.calls).toHaveLength(2);
  });
});
