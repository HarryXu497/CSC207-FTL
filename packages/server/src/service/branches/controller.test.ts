import { once } from 'node:events';
import type { Server } from 'node:http';
import type { Call, Message } from 'src/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
} from 'src/repository';
import { createApp } from 'src/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostMessageOutputData } from '../messages/PostMessage';
import type { CreateBranchOutputData } from './CreateBranch';

const call: Call = {
  id: 'call-1',
  customerName: 'Priya',
  topic: 'Damaged delivery',
  createdAt: '2026-01-01T12:00:00.000Z',
};
let server: Server;
let url: string;
let original: Message[];

beforeAll(async () => {
  const calls = new InMemoryCallRepository([call]);
  const factory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, factory, []);
  await factory('calls', call.id).addMessages([
    { role: 'customer', content: 'Customer opening', createdAt: call.createdAt },
    { role: 'agent', content: 'Original agent reply', createdAt: '2026-01-01T12:01:00.000Z' },
    { role: 'customer', content: 'Later customer turn', createdAt: '2026-01-01T12:02:00.000Z' },
  ]);
  original = await factory('calls', call.id).getAllMessages();
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

async function request(path: string, body?: unknown) {
  const response = await fetch(
    `${url}${path}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  return { status: response.status, body: (await response.json()) as unknown };
}

describe('branch creation', () => {
  it('copies only the history before the selected reply', async () => {
    const response = await request('/calls/call-1/branches', { branchIndex: 1 });
    expect(response.status).toBe(201);
    const { branch } = response.body as CreateBranchOutputData;
    expect(branch).toMatchObject({
      parentId: call.id,
      branchIndex: 1,
    });
    const history = await request(`/calls/call-1/branches/${branch.id}/messages`);
    expect(history.status).toBe(200);
    expect(
      (history.body as { messages: Message[] }).messages.map((message) => message.content),
    ).toEqual(['Customer opening']);
    expect(await request('/calls/call-1/messages')).toEqual({
      status: 200,
      body: { messages: original },
    });
  });

  it('starts empty before the first message and accepts a new agent turn', async () => {
    const response = await request('/calls/call-1/branches', {
      branchIndex: 0,
    });
    expect(response.status).toBe(201);
    const { branch } = response.body as CreateBranchOutputData;
    const path = `/calls/call-1/branches/${branch.id}/messages`;
    expect(await request(path)).toEqual({ status: 200, body: { messages: [] } });

    const posted = await request(path, { role: 'agent', content: 'Hello, how can I help?' });
    expect(posted.status).toBe(201);
    const { message } = posted.body as PostMessageOutputData;
    expect(await request(path)).toEqual({ status: 200, body: { messages: [message] } });
    expect(await request('/calls/call-1/messages')).toEqual({
      status: 200,
      body: { messages: original },
    });
  });

  it('rejects invalid indices without creating a branch', async () => {
    const before = await request('/calls/call-1/branches');
    for (const body of [{ branchIndex: 3 }, { branchIndex: -1 }, { branchIndex: 0.5 }]) {
      expect(await request('/calls/call-1/branches', body)).toEqual({
        status: 400,
        body: { error: { message: expect.any(String) } },
      });
    }
    expect(await request('/calls/call-1/branches')).toEqual(before);
  });
});
