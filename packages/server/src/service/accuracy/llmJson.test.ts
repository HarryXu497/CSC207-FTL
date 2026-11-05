import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { LlmClient } from 'src/repository';
import { LlmOutputError, completeJson, extractJson } from './llmJson';

const schema = z.object({ ok: z.boolean() });

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

  it('throws when there is no JSON object', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('completeJson', () => {
  it('returns parsed data on the first valid reply', async () => {
    const llm = llmReplying('{"ok": true}');
    expect(await completeJson(llm, { system: 's', user: 'u' }, schema)).toEqual({ ok: true });
    expect(llm.calls).toHaveLength(1);
  });

  it('retries once, telling the model what was wrong', async () => {
    const llm = llmReplying('{"ok": "yes"}', '{"ok": true}');
    expect(await completeJson(llm, { system: 's', user: 'u' }, schema)).toEqual({ ok: true });
    expect(llm.calls[1]).toContain('was rejected');
    expect(llm.calls[1]).toContain('ok');
  });

  it('throws LlmOutputError after the attempts run out', async () => {
    const llm = llmReplying('garbage');
    await expect(completeJson(llm, { system: 's', user: 'u' }, schema)).rejects.toBeInstanceOf(
      LlmOutputError,
    );
    expect(llm.calls).toHaveLength(2);
  });
});
