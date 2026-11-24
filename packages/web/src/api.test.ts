import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('simulation API reads', () => {
  it('loads call and branch context with escaped IDs and cancellation', async () => {
    const branch = { id: 'branch#1', parentId: 'call /?' };
    const messages = [{ id: 'message-1', role: 'agent', content: 'Hello.' }];
    const messageSentiments = [{ messageId: 'message-1', result: { ok: false, reason: 'empty' } }];
    const accuracy = { score: null };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({ branches: [branch] }))
      .mockResolvedValueOnce(reply({ branch }))
      .mockResolvedValueOnce(reply({ messages }))
      .mockResolvedValueOnce(reply({ messages }))
      .mockResolvedValueOnce(reply({ messageSentiments }))
      .mockResolvedValueOnce(reply({ accuracy }));
    vi.stubGlobal('fetch', fetch);
    const { signal } = new AbortController();

    expect(await api.listBranches('call /?', signal)).toEqual({ branches: [branch] });
    expect(await api.getBranch('call /?', 'branch#1', signal)).toEqual({ branch });
    expect(await api.getCallMessages('call /?', signal)).toEqual({ messages });
    expect(await api.getBranchMessages('call /?', 'branch#1', signal)).toEqual({ messages });
    expect(await api.getBranchSentiment('call /?', 'branch#1', signal)).toEqual({
      messageSentiments,
    });
    expect(await api.getBranchAccuracy('call /?', 'branch#1', signal)).toEqual({ accuracy });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/calls/call%20%2F%3F/branches',
      '/api/calls/call%20%2F%3F/branches/branch%231',
      '/api/calls/call%20%2F%3F/messages',
      '/api/calls/call%20%2F%3F/branches/branch%231/messages',
      '/api/calls/call%20%2F%3F/branches/branch%231/sentiment',
      '/api/calls/call%20%2F%3F/branches/branch%231/accuracy',
    ]);
    for (const [, init] of fetch.mock.calls) expect(init?.signal).toBe(signal);
  });

  it('analyzes the stored branch without sending a client transcript', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => reply({}));
    vi.stubGlobal('fetch', fetch);
    const { signal } = new AbortController();

    await api.analyzeBranchSentiment('call /?', 'branch#1', signal);
    await api.analyzeBranchAccuracy('call /?', 'branch#1', signal);

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/calls/call%20%2F%3F/branches/branch%231/sentiment',
      '/api/calls/call%20%2F%3F/branches/branch%231/accuracy',
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init).toMatchObject({ method: 'POST', signal });
      expect(init?.body).toBeUndefined();
    }
  });

  it.each([409, 503])('preserves HTTP %i so the UI can handle it separately', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({ error: { message: 'Try again later.' } }, status)),
    );
    const request = api.getBranch('call-1', 'branch-1');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ status, message: 'Try again later.' });
  });

  it('keeps a useful status and message when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));

    await expect(api.getBranch('call-1', 'branch-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'Request failed with status 502.',
    });
  });
});
