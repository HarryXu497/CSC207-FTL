import type { Call, Message } from 'src/entities';
import { SimulationConflictError } from 'src/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMessageRepositoryBuilder,
  InMemoryCallRepository,
  type MessageRepository,
} from '../database';
import type { SimulationGenerator } from './SimulationGenerator';
import { StoredSimulationRepository } from './StoredSimulationRepository';

const call: Call = {
  id: 'call-1',
  customerName: 'Priya',
  topic: 'Damaged delivery',
  createdAt: '2026-11-24T12:00:00.000Z',
};
const target = { callId: call.id, branchId: 'branch-1' };
const replyText = 'My order number is 123.';
const agentMessage: Omit<Message, 'id'> = {
  role: 'agent',
  content: 'What is your order number?',
  createdAt: '2099-01-01T12:00:00.000Z',
};

describe('StoredSimulationRepository', () => {
  let messages: MessageRepository;
  let originalMessages: MessageRepository;
  let expectedLastMessageId: string;
  let generate: ReturnType<typeof vi.fn<SimulationGenerator['generate']>>;
  let repository: StoredSimulationRepository;

  beforeEach(async () => {
    const calls = new InMemoryCallRepository([call]);
    const factory = createMessageRepositoryBuilder('memory');
    messages = factory('branches', target.branchId);
    originalMessages = factory('calls', call.id);
    await originalMessages.addMessage({ ...agentMessage, content: 'Original transcript.' });
    expectedLastMessageId = await messages.addMessage(agentMessage);
    generate = vi.fn<SimulationGenerator['generate']>().mockResolvedValue(replyText);
    repository = new StoredSimulationRepository(calls, factory, { generate });
  });

  it('shares overlapping requests for an agent turn and saves one reply without changing the original call', async () => {
    const history = await messages.getAllMessages();
    const original = await originalMessages.getAllMessages();
    let finish!: (text: string) => void;
    let started!: () => void;
    const generating = new Promise<void>((resolve) => {
      started = resolve;
    });
    generate.mockImplementationOnce(() => {
      started();
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    });

    const first = repository.simulateCustomerReply(target, expectedLastMessageId);
    await generating;
    const second = repository.simulateCustomerReply(target, expectedLastMessageId);
    finish(replyText);
    const [reply, duplicate] = await Promise.all([first, second]);

    expect(generate).toHaveBeenCalledExactlyOnceWith({ scenario: call, history });
    expect(duplicate).toEqual(reply);
    expect(reply).toEqual({
      id: expect.any(String),
      role: 'customer',
      content: replyText,
      createdAt: expect.any(String),
    });
    expect(Date.parse(reply.createdAt)).toBeGreaterThan(Date.parse(agentMessage.createdAt));
    expect(await messages.getAllMessages()).toEqual([...history, reply]);
    expect(await originalMessages.getAllMessages()).toEqual(original);
    await expect(
      repository.simulateCustomerReply(target, expectedLastMessageId),
    ).rejects.toBeInstanceOf(SimulationConflictError);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('lets the same agent turn retry after a shared generation fails', async () => {
    const before = await messages.getAllMessages();
    const failure = new Error('Model unavailable');
    generate.mockRejectedValueOnce(failure);

    const first = repository.simulateCustomerReply(target, expectedLastMessageId);
    const second = repository.simulateCustomerReply(target, expectedLastMessageId);
    await Promise.all([expect(first).rejects.toBe(failure), expect(second).rejects.toBe(failure)]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await messages.getAllMessages()).toEqual(before);

    const reply = await repository.simulateCustomerReply(target, expectedLastMessageId);
    expect(reply).toMatchObject({ role: 'customer', content: replyText });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await messages.getAllMessages()).toEqual([...before, reply]);
  });

  it('rejects a stale expected message before calling the generator', async () => {
    const before = await messages.getAllMessages();

    await expect(
      repository.simulateCustomerReply(target, 'old-agent-message'),
    ).rejects.toBeInstanceOf(SimulationConflictError);

    expect(generate).not.toHaveBeenCalled();
    expect(await messages.getAllMessages()).toEqual(before);
  });

  it('discards the generated reply when a new message arrives during generation', async () => {
    generate.mockImplementationOnce(async () => {
      await messages.addMessage({
        ...agentMessage,
        content: 'Let me clarify my question.',
        createdAt: '2099-01-01T12:01:00.000Z',
      });
      return replyText;
    });

    await expect(
      repository.simulateCustomerReply(target, expectedLastMessageId),
    ).rejects.toBeInstanceOf(SimulationConflictError);

    const saved = await messages.getAllMessages();
    expect(saved).toHaveLength(2);
    expect(saved.every((message) => message.role === 'agent')).toBe(true);
    expect(saved[1]?.content).toBe('Let me clarify my question.');
  });
});
