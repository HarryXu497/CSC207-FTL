import { once } from 'node:events';
import type { Call, Document, Message } from '@recall/server/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  RagSimulationGenerator,
  StoredSimulationRepository,
  type LlmClient,
  type Retriever,
} from '@recall/server/repository';
import { createApp } from '@recall/server/server';
import { describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('simulation through the web API client', () => {
  it('branches, saves an agent turn, generates from company context, and reopens the saved conversation', async () => {
    const call: Call = {
      id: 'call-1',
      customerName: 'Priya',
      topic: 'Damaged delivery',
      createdAt: '2026-01-01T12:00:00.000Z',
    };
    const factory = createMessageRepositoryBuilder('memory');
    const calls = new InMemoryCallRepository([call]);
    const branches = new InMemoryBranchRepository(calls, factory, []);
    const history: Omit<Message, 'id'>[] = [
      { role: 'customer', content: 'My lamp arrived damaged.', createdAt: call.createdAt },
      {
        role: 'agent',
        content: 'Original reply to replace.',
        createdAt: '2026-01-01T12:01:00.000Z',
      },
      {
        role: 'customer',
        content: 'Later original response.',
        createdAt: '2026-01-01T12:02:00.000Z',
      },
    ];
    await factory('calls', call.id).addMessages(history);
    const original = await factory('calls', call.id).getAllMessages();
    const document: Document = {
      id: 'replacement-policy',
      content: 'Damaged deliveries can be replaced within 14 days.',
      metadata: { source: 'replacement-policy.txt' },
    };
    const retriever: Retriever = { search: vi.fn().mockResolvedValue([document]) };
    const complete = vi.fn<LlmClient['complete']>().mockResolvedValue('My order number is 123.');
    const simulationRepo = new StoredSimulationRepository(
      calls,
      factory,
      new RagSimulationGenerator(retriever, { complete }),
    );
    const server = createApp(calls, branches, factory, 'memory', { simulationRepo }).listen(
      0,
      '127.0.0.1',
    );
    await once(server, 'listening');

    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Test server has no TCP address.');
      const origin = `http://127.0.0.1:${address.port}`;
      const realFetch = globalThis.fetch;
      vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== 'string' || !input.startsWith('/api/')) {
          throw new Error('Expected a local API request.');
        }
        return realFetch(`${origin}${input}`, init);
      });

      expect(await api.getCall(call.id)).toEqual({ call });
      await expect(api.getCall('missing-call')).rejects.toMatchObject({
        status: 404,
        message: 'Call not found: missing-call',
      });
      const { branch } = await api.createBranch(call.id, { branchIndex: 1, position: 'before' });
      expect((await api.listBranches(call.id)).branches).toEqual([branch]);
      expect((await api.getBranch(call.id, branch.id)).branch).toEqual(branch);
      const { messages: prefix } = await api.getBranchMessages(call.id, branch.id);
      expect(prefix.map((message) => message.content)).toEqual(['My lamp arrived damaged.']);

      const { message: agent } = await api.postBranchMessage(call.id, branch.id, {
        role: 'agent',
        content: 'I can arrange a replacement. What is your order number?',
      });
      const { message: customer } = await api.simulateMessage(call.id, branch.id, {
        expectedLastMessageId: agent.id,
      });
      expect(customer).toMatchObject({ role: 'customer', content: 'My order number is 123.' });
      const conversation = { messages: [...prefix, agent, customer] };
      expect(await api.getBranchMessages(call.id, branch.id)).toEqual(conversation);
      expect(await api.getCallMessages(call.id)).toEqual({ messages: original });
      expect(retriever.search).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining(agent.content),
        5,
      );
      expect(complete).toHaveBeenCalledTimes(1);
      expect(JSON.parse(complete.mock.calls[0]![0].user)).toEqual({
        scenario: { customerName: call.customerName, topic: call.topic },
        history: [
          { role: 'customer', content: 'My lamp arrived damaged.' },
          { role: 'agent', content: agent.content },
        ],
        companyDocuments: [
          { id: document.id, source: 'replacement-policy.txt', content: document.content },
        ],
      });

      await expect(
        api.simulateMessage(call.id, branch.id, { expectedLastMessageId: agent.id }),
      ).rejects.toMatchObject({ status: 409 });
      expect(complete).toHaveBeenCalledTimes(1);
      expect(await api.getBranchMessages(call.id, branch.id)).toEqual(conversation);
    } finally {
      vi.unstubAllGlobals();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  });
});
