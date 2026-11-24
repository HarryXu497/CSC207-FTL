import { once } from 'node:events';
import type { Branch, Call, Message } from 'src/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  type SimulationRepository,
} from 'src/repository';
import { createApp } from 'src/server';
import { describe, expect, it, vi } from 'vitest';

const call: Call = {
  id: 'call-1',
  customerName: 'Priya',
  topic: 'Damaged delivery',
  createdAt: '2026-11-23T12:00:00.000Z',
};
const branch: Branch = { ...call, id: 'branch-1', parentId: call.id, branchIndex: 0 };

const message: Message = {
  id: 'customer-reply',
  role: 'customer',
  content: 'My order number is 123.',
  createdAt: '2026-11-23T12:01:00.000Z',
};

function createSimulationRepository() {
  return {
    simulateCustomerReply: vi
      .fn<SimulationRepository['simulateCustomerReply']>()
      .mockResolvedValue(message),
  };
}

async function postSimulation(simulationRepo: SimulationRepository | null, body: unknown) {
  const calls = new InMemoryCallRepository([call]);
  const messageRepoFactory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, messageRepoFactory, [branch]);
  const app = createApp(
    calls,
    branches,
    messageRepoFactory,
    'memory',
    simulationRepo ? { simulationRepo } : undefined,
  );
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/calls/call-1/branches/branch-1/simulate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const responseBody: unknown = await response.json();
    return { status: response.status, body: responseBody };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
}

describe('SimulationController', () => {
  it('simulates the selected target through the app and returns the saved message', async () => {
    const simulation = createSimulationRepository();

    const response = await postSimulation(simulation, { expectedLastMessageId: 'agent-message' });

    expect(response).toEqual({ status: 201, body: { message } });
    expect(simulation.simulateCustomerReply).toHaveBeenCalledExactlyOnceWith(
      { callId: call.id, branchId: branch.id },
      'agent-message',
    );
  });

  it('rejects a blank expected message ID without invoking simulation', async () => {
    const simulation = createSimulationRepository();

    const response = await postSimulation(simulation, { expectedLastMessageId: '   ' });

    expect(response).toEqual({
      status: 400,
      body: { error: { message: expect.any(String) } },
    });
    expect(simulation.simulateCustomerReply).not.toHaveBeenCalled();
  });

  it('returns 503 when no simulation repository is configured', async () => {
    const response = await postSimulation(null, { expectedLastMessageId: 'agent-message' });

    expect(response).toEqual({
      status: 503,
      body: { error: { message: 'Simulation is not available.' } },
    });
  });
});
