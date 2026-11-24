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
  const branches = new InMemoryBranchRepository(calls, factory, [branch]);
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

describe('MessagesController', () => {
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
