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

  it('appends after future-dated branch history and preserves the original transcript', async () => {
    const original = factory('calls', call.id);
    await original.addMessage({
      ...messageData,
      content: 'Original reply.',
      createdAt: call.createdAt,
    });
    const before = await original.getAllMessages();
    const messages = factory('branches', branch.id);
    const historyId = await messages.addMessage({
      role: 'customer',
      content: 'My delivery arrived damaged.',
      createdAt: '2099-01-01T12:00:00.000Z',
    });

    await interactor.handle({ callId: call.id, branchId: branch.id, messageData }, presenter);

    const saved = await messages.getAllMessages();
    expect(saved).toEqual([
      {
        id: historyId,
        role: 'customer',
        content: 'My delivery arrived damaged.',
        createdAt: '2099-01-01T12:00:00.000Z',
      },
      { ...messageData, id: expect.any(String), createdAt: expect.any(String) },
    ]);
    expect(Date.parse(saved[1]!.createdAt)).toBeGreaterThan(Date.parse(saved[0]!.createdAt));
    expect(presenter.present).toHaveBeenCalledExactlyOnceWith({ message: saved[1] });
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
