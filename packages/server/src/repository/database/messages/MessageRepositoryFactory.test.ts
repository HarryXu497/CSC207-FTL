import type { Message } from 'src/entities';
import { describe, expect, it, vi } from 'vitest';
import { createMessageRepositoryBuilder } from './MessageRepositoryFactory';

const agentMessage: Omit<Message, 'id'> = {
  role: 'agent',
  content: 'What is your order number?',
  createdAt: '2026-11-24T12:00:00.000Z',
};

describe('createMessageRepositoryBuilder', () => {
  it('preserves a branch conversation across lookups and separates different branches', async () => {
    const factory = createMessageRepositoryBuilder('memory');
    const id = await factory('branches', 'branch-1').addMessage(agentMessage);

    expect(await factory('branches', 'branch-1').getAllMessages()).toEqual([
      { id, ...agentMessage },
    ]);
    expect(await factory('branches', 'branch-2').getAllMessages()).toEqual([]);
  });

  it('isolates messages and subscriptions for a call and branch with the same ID', async () => {
    const factory = createMessageRepositoryBuilder('memory');
    const call = factory('calls', 'same-id');
    const branch = factory('branches', 'same-id');
    const callUpdates = vi.fn();
    const branchUpdates = vi.fn();
    const unsubscribeCall = call.subscribe(callUpdates);
    const unsubscribeBranch = branch.subscribe(branchUpdates);

    try {
      const callMessageId = await call.addMessage(agentMessage);
      expect(await branch.getAllMessages()).toEqual([]);
      expect(branchUpdates).toHaveBeenCalledExactlyOnceWith([]);

      const practiceMessage = { ...agentMessage, content: 'My alternative agent reply.' };
      const branchMessageId = await branch.addMessage(practiceMessage);
      const callMessages = [{ id: callMessageId, ...agentMessage }];
      const branchMessages = [{ id: branchMessageId, ...practiceMessage }];

      expect(await call.getAllMessages()).toEqual(callMessages);
      expect(await branch.getAllMessages()).toEqual(branchMessages);
      expect(callUpdates).toHaveBeenCalledTimes(2);
      expect(callUpdates).toHaveBeenLastCalledWith(callMessages);
      expect(branchUpdates).toHaveBeenCalledTimes(2);
      expect(branchUpdates).toHaveBeenLastCalledWith(branchMessages);
    } finally {
      unsubscribeCall();
      unsubscribeBranch();
    }
  });
});
