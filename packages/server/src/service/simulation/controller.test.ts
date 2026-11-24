import { once } from 'node:events';
import express from 'express';
import type { Message } from 'src/entities';
import { describe, expect, it, vi } from 'vitest';
import type { SimulateMessageInputBoundary } from './SimulateMessage';
import { SimulationController } from './controller';

const message: Message = {
  id: 'customer-reply',
  role: 'customer',
  content: 'My order number is 123.',
  createdAt: '2026-11-23T12:01:00.000Z',
};

function createInteractor() {
  return {
    handle: vi
      .fn<SimulateMessageInputBoundary['handle']>()
      .mockImplementation(async (_input, presenter) => presenter.present({ message })),
  };
}

async function postSimulation(interactor: SimulateMessageInputBoundary | null, body: unknown) {
  const app = express();
  app.use(express.json());
  app.use('/api', new SimulationController(interactor).router());
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
  it('passes the selected target to the interactor and returns the saved message', async () => {
    const interactor = createInteractor();

    const response = await postSimulation(interactor, { expectedLastMessageId: 'agent-message' });

    expect(response).toEqual({ status: 201, body: { message } });
    expect(interactor.handle).toHaveBeenCalledOnce();
    expect(interactor.handle.mock.calls[0]?.[0]).toEqual({
      callId: 'call-1',
      branchId: 'branch-1',
      expectedLastMessageId: 'agent-message',
    });
  });

  it('rejects a blank expected message ID without invoking the interactor', async () => {
    const interactor = createInteractor();

    const response = await postSimulation(interactor, { expectedLastMessageId: '   ' });

    expect(response).toEqual({
      status: 400,
      body: { error: { message: expect.any(String) } },
    });
    expect(interactor.handle).not.toHaveBeenCalled();
  });

  it('returns 503 when no simulation interactor is configured', async () => {
    const response = await postSimulation(null, { expectedLastMessageId: 'agent-message' });

    expect(response).toEqual({
      status: 503,
      body: { error: { message: 'Simulation is not available.' } },
    });
  });
});
