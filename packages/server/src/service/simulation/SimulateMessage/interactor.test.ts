import type { Branch, Call, Message } from 'src/entities';
import { SimulationConflictError } from 'src/errors';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  type SimulationRepository,
} from 'src/repository';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulateMessageInteractor } from './interactor';
import type { SimulateMessageOutputBoundary } from './output';

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
const expectedLastMessageId = 'agent-message';

describe('SimulateMessageInteractor', () => {
  let branches: InMemoryBranchRepository;
  let simulation: SimulationRepository;
  let presenter: SimulateMessageOutputBoundary;
  let interactor: SimulateMessageInteractor;

  beforeEach(() => {
    const calls = new InMemoryCallRepository([call]);
    branches = new InMemoryBranchRepository(calls, createMessageRepositoryBuilder('memory'), [
      branch,
    ]);
    simulation = {
      simulateCustomerReply: vi
        .fn<SimulationRepository['simulateCustomerReply']>()
        .mockResolvedValue(message),
    };
    presenter = {
      present: vi.fn<SimulateMessageOutputBoundary['present']>(),
      presentBadRequest: vi.fn<SimulateMessageOutputBoundary['presentBadRequest']>(),
      presentNotFound: vi.fn<SimulateMessageOutputBoundary['presentNotFound']>(),
      presentConflict: vi.fn<SimulateMessageOutputBoundary['presentConflict']>(),
      presentServiceUnavailable:
        vi.fn<SimulateMessageOutputBoundary['presentServiceUnavailable']>(),
    };
    interactor = new SimulateMessageInteractor(calls, branches, simulation);
  });

  it('simulates the selected branch and presents the saved customer message', async () => {
    await interactor.handle(
      { callId: call.id, branchId: branch.id, expectedLastMessageId },
      presenter,
    );

    expect(simulation.simulateCustomerReply).toHaveBeenCalledExactlyOnceWith(
      { callId: call.id, branchId: branch.id },
      expectedLastMessageId,
    );
    expect(presenter.present).toHaveBeenCalledExactlyOnceWith({ message });
  });

  it.each([
    ['call', 'missing-call', branch.id],
    ['branch', call.id, 'missing-branch'],
  ])('rejects a missing %s without simulating', async (_name, callId, branchId) => {
    await interactor.handle({ callId, branchId, expectedLastMessageId }, presenter);

    expect(presenter.presentNotFound).toHaveBeenCalledOnce();
    expect(simulation.simulateCustomerReply).not.toHaveBeenCalled();
    expect(presenter.present).not.toHaveBeenCalled();
  });

  it('rejects a branch belonging to another call without simulating', async () => {
    await branches.setBranch({ ...branch, parentId: 'another-call' });

    await interactor.handle(
      { callId: call.id, branchId: branch.id, expectedLastMessageId },
      presenter,
    );

    expect(presenter.presentNotFound).toHaveBeenCalledOnce();
    expect(simulation.simulateCustomerReply).not.toHaveBeenCalled();
    expect(presenter.present).not.toHaveBeenCalled();
  });

  it('presents a conflict when the conversation changes', async () => {
    const error = new SimulationConflictError(
      'The conversation changed while generating the reply.',
    );
    vi.mocked(simulation.simulateCustomerReply).mockRejectedValueOnce(error);

    await interactor.handle(
      { callId: call.id, branchId: branch.id, expectedLastMessageId },
      presenter,
    );

    expect(presenter.presentConflict).toHaveBeenCalledExactlyOnceWith(error.message);
    expect(presenter.present).not.toHaveBeenCalled();
  });
});
