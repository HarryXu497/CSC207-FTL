import { once } from 'node:events';
import type { Branch, Call, Message } from 'src/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  type Ingestor,
  type SimulationRepository,
} from 'src/repository';
import { expect, it, vi } from 'vitest';
import { createApp } from './app';

it('keeps document ingestion and customer simulation available in the same app', async () => {
  const call: Call = {
    id: 'call-1',
    customerName: 'Priya',
    topic: 'Damaged delivery',
    createdAt: '2026-01-01T12:00:00Z',
  };
  const branch: Branch = { ...call, id: 'branch-1', parentId: call.id, branchIndex: 0 };
  const reply: Message = {
    id: 'customer-1',
    role: 'customer',
    content: 'My order number is 123.',
    createdAt: '2026-01-01T12:01:00Z',
  };
  const calls = new InMemoryCallRepository([call]);
  const factory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, factory, [branch]);
  const ingestor: Ingestor = {
    ingest: vi.fn<Ingestor['ingest']>(),
    ingestFile: vi.fn<Ingestor['ingestFile']>().mockResolvedValue(1),
  };
  const simulationRepo: SimulationRepository = {
    simulateCustomerReply: vi
      .fn<SimulationRepository['simulateCustomerReply']>()
      .mockResolvedValue(reply),
  };
  const server = createApp(calls, branches, factory, 'memory', { ingestor, simulationRepo }).listen(
    0,
    '127.0.0.1',
  );
  await once(server, 'listening');

  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
    const origin = `http://127.0.0.1:${address.port}/api`;
    const upload = await fetch(`${origin}/documents`, { method: 'POST' });
    expect(upload.status).toBe(400);
    expect(await upload.json()).toEqual({ error: { message: 'A document file is required.' } });
    expect(ingestor.ingestFile).not.toHaveBeenCalled();

    const simulated = await fetch(`${origin}/calls/${call.id}/branches/${branch.id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedLastMessageId: 'agent-1' }),
    });
    expect(simulated.status).toBe(201);
    expect(await simulated.json()).toEqual({ message: reply });
    expect(simulationRepo.simulateCustomerReply).toHaveBeenCalledExactlyOnceWith(
      { callId: call.id, branchId: branch.id },
      'agent-1',
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
});
