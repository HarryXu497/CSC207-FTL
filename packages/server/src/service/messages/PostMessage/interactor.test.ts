import type { Branch, Call } from 'src/entities';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  type MessageRepositoryBuilder,
} from 'src/repository';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostMessageInteractor } from './interactor';
import type { PostMessageOutputBoundary } from './output';

const call: Call = {
  id: 'call-1',
  customerName: 'Priya',
  topic: 'Damaged delivery',
  createdAt: '2026-11-24T12:00:00.000Z',
};
const branch: Branch = { ...call, id: 'branch-1', parentId: call.id, branchIndex: 0 };
const messageData = { role: 'agent', content: 'What is your order number?' } as const;

describe('PostMessageInteractor', () => {
  let factory: MessageRepositoryBuilder;
  let interactor: PostMessageInteractor;
  let presenter: PostMessageOutputBoundary;

  beforeEach(() => {
    const calls = new InMemoryCallRepository([call, { ...call, id: 'other-call' }]);
    factory = vi.fn(createMessageRepositoryBuilder('memory'));
    const branches = new InMemoryBranchRepository(calls, factory, [branch]);
    interactor = new PostMessageInteractor(calls, branches, factory);
    presenter = { present: vi.fn(), presentBadRequest: vi.fn(), presentNotFound: vi.fn() };
  });

  it('saves the branch message with server metadata and preserves the original transcript', async () => {
    const original = factory('calls', call.id);
    await original.addMessage({
      ...messageData,
      content: 'Original reply.',
      createdAt: call.createdAt,
    });
    const before = await original.getAllMessages();

    await interactor.handle({ callId: call.id, branchId: branch.id, messageData }, presenter);

    const saved = await factory('branches', branch.id).getAllMessages();
    expect(saved).toEqual([
      { ...messageData, id: expect.any(String), createdAt: expect.any(String) },
    ]);
    expect(presenter.present).toHaveBeenCalledExactlyOnceWith({ message: saved[0] });
    expect(await original.getAllMessages()).toEqual(before);
  });

  it.each([
    ['missing call', 'missing-call', branch.id],
    ['missing branch', call.id, 'missing-branch'],
    ['different parent', 'other-call', branch.id],
  ])('rejects a %s before accessing message storage', async (_name, callId, branchId) => {
    await interactor.handle({ callId, branchId, messageData }, presenter);

    expect(presenter.presentNotFound).toHaveBeenCalledOnce();
    expect(presenter.present).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  });
});
