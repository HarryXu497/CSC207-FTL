import { once } from 'node:events';
import type { Server } from 'node:http';
import type { Branch, Call, Message } from 'src/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
} from 'src/repository';
import { createApp } from 'src/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostMessageOutputData } from './PostMessage';

const call: Call = {
  id: 'call-1',
  customerName: 'Priya',
  topic: 'Damaged delivery',
  createdAt: '2026-11-24T12:00:00.000Z',
};
const branch: Branch = { ...call, id: 'branch-1', parentId: call.id, branchIndex: 0 };
let server: Server;
let url: string;
let callMessages: Message[];
let branchMessages: Message[];

beforeAll(async () => {
  const calls = new InMemoryCallRepository([call, { ...call, id: 'other-call' }]);
  const factory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, factory, [
    branch,
    { ...branch, id: 'posting-branch' },
    { ...branch, id: 'streaming-branch' },
  ]);
  await factory('calls', call.id).addMessage({
    role: 'agent',
    content: 'Original call transcript.',
    createdAt: call.createdAt,
  });
  await factory('branches', branch.id).addMessage({
    role: 'customer',
    content: 'Practice branch transcript.',
    createdAt: call.createdAt,
  });
  await factory('branches', 'streaming-branch').addMessage({
    role: 'customer',
    content: 'My delivery arrived damaged.',
    createdAt: call.createdAt,
  });
  callMessages = await factory('calls', call.id).getAllMessages();
  branchMessages = await factory('branches', branch.id).getAllMessages();
  server = createApp(calls, branches, factory, 'memory').listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
  url = `http://127.0.0.1:${address.port}/api`;
});

afterAll(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function getMessages(path: string) {
  const response = await fetch(`${url}${path}`);
  return { status: response.status, body: (await response.json()) as unknown };
}

async function postMessage(path: string, body: unknown) {
  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

describe('MessagesController', () => {
  it('streams saved branch history and subsequent messages through the controller', async () => {
    const path = '/calls/call-1/branches/streaming-branch/messages';
    const initial = (await getMessages(path)).body as { messages: Message[] };
    const response = await fetch(`${url}${path}/stream`, {
      signal: AbortSignal.timeout(3000),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream response has no body.');

    try {
      const decoder = new TextDecoder();
      let buffer = '';
      async function nextSnapshot() {
        while (!buffer.includes('\n\n')) {
          const chunk = await reader!.read();
          if (chunk.done) throw new Error('Stream closed before the next snapshot.');
          buffer += decoder.decode(chunk.value, { stream: true });
        }
        const end = buffer.indexOf('\n\n');
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        return JSON.parse(event.slice('data: '.length)) as Message[];
      }

      expect(await nextSnapshot()).toEqual(initial.messages);
      const posted = await postMessage(path, {
        role: 'agent',
        content: 'I can arrange a replacement.',
      });
      expect(posted.status).toBe(201);
      const { message } = posted.body as PostMessageOutputData;
      expect(await nextSnapshot()).toEqual([...initial.messages, message]);
    } finally {
      await reader.cancel();
    }
  });

  it.each([
    '/calls/missing-call/messages/stream',
    '/calls/call-1/branches/missing-branch/messages/stream',
    '/calls/other-call/branches/branch-1/messages/stream',
  ])('rejects an invalid stream target with JSON at %s', async (path) => {
    const response = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(3000) });

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: { message: expect.any(String) } });
  });

  it('loads the selected branch transcript and keeps original call loading separate', async () => {
    expect(await getMessages('/calls/call-1/branches/branch-1/messages')).toEqual({
      status: 200,
      body: { messages: branchMessages },
    });
    expect(await getMessages('/calls/call-1/messages')).toEqual({
      status: 200,
      body: { messages: callMessages },
    });
  });

  it('returns 404 when the branch belongs to a different call', async () => {
    expect(await getMessages('/calls/other-call/branches/branch-1/messages')).toEqual({
      status: 404,
      body: { error: { message: expect.any(String) } },
    });
  });

  it.each([
    '/calls/missing-call/branches/branch-1/messages',
    '/calls/call-1/branches/missing-branch/messages',
  ])('returns 404 for a missing target at %s', async (path) => {
    expect(await getMessages(path)).toEqual({
      status: 404,
      body: { error: { message: expect.any(String) } },
    });
  });
});

describe('message posting', () => {
  it.each(['/calls/other-call/messages', '/calls/call-1/branches/posting-branch/messages'])(
    'saves a message through the controller at %s',
    async (path) => {
      const response = await postMessage(path, {
        role: 'agent',
        content: '  What is your order number?  ',
        id: 'client-id',
        createdAt: 'client-time',
      });
      expect(response).toEqual({
        status: 201,
        body: {
          message: {
            role: 'agent',
            content: 'What is your order number?',
            id: expect.any(String),
            createdAt: expect.any(String),
          },
        },
      });
      const { message } = response.body as PostMessageOutputData;
      expect(message.id).not.toBe('client-id');
      expect(Number.isFinite(Date.parse(message.createdAt))).toBe(true);
      expect(await getMessages(path)).toEqual({ status: 200, body: { messages: [message] } });
      expect(await getMessages('/calls/call-1/messages')).toEqual({
        status: 200,
        body: { messages: callMessages },
      });
    },
  );

  it('rejects the wrong parent call without saving a branch message', async () => {
    const path = '/calls/call-1/branches/posting-branch/messages';
    const before = await getMessages(path);
    expect(
      await postMessage('/calls/other-call/branches/posting-branch/messages', {
        role: 'agent',
        content: 'This belongs to a different call.',
      }),
    ).toEqual({ status: 404, body: { error: { message: expect.any(String) } } });
    expect(await getMessages(path)).toEqual(before);
  });

  it('rejects blank content without saving a message', async () => {
    const path = '/calls/call-1/branches/posting-branch/messages';
    const before = await getMessages(path);
    expect(await postMessage(path, { role: 'agent', content: '   ' })).toEqual({
      status: 400,
      body: { error: { message: expect.any(String) } },
    });
    expect(await getMessages(path)).toEqual(before);
  });
});
