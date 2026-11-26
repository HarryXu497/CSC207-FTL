import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, messageStreamUrl } from './api';

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
  it('builds call and branch stream URLs with escaped IDs', () => {
    expect(messageStreamUrl('call /?')).toBe('/api/calls/call%20%2F%3F/messages/stream');
    expect(messageStreamUrl('call /?', 'branch#1')).toBe(
      '/api/calls/call%20%2F%3F/branches/branch%231/messages/stream',
    );
  });

  it('loads call and branch context with escaped IDs and cancellation', async () => {
    const branch = { id: 'branch#1', parentId: 'call /?' };
    const messages = [{ id: 'message-1', role: 'agent', content: 'Hello.' }];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({ branches: [branch] }))
      .mockResolvedValueOnce(reply({ branch }))
      .mockResolvedValueOnce(reply({ messages }))
      .mockResolvedValueOnce(reply({ messages }));
    vi.stubGlobal('fetch', fetch);
    const { signal } = new AbortController();

    expect(await api.listBranches('call /?', signal)).toEqual({ branches: [branch] });
    expect(await api.getBranch('call /?', 'branch#1', signal)).toEqual({ branch });
    expect(await api.getCallMessages('call /?', signal)).toEqual({ messages });
    expect(await api.getBranchMessages('call /?', 'branch#1', signal)).toEqual({ messages });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/calls/call%20%2F%3F/branches',
      '/api/calls/call%20%2F%3F/branches/branch%231',
      '/api/calls/call%20%2F%3F/messages',
      '/api/calls/call%20%2F%3F/branches/branch%231/messages',
    ]);
    for (const [, init] of fetch.mock.calls) expect(init?.signal).toBe(signal);
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
