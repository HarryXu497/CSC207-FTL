/**
 * Unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryMessageRepository } from './InMemoryMessageRepository';
import type { Message } from 'src/entities';

let repo: InMemoryMessageRepository;

beforeEach(() => {
  repo = new InMemoryMessageRepository();
});

describe('getAllMessages', () => {
  it('returns seeded messages in ascending order', async () => {
    const messages = await repo.getAllMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('agent');
    expect(messages[1]?.role).toBe('customer');
  });
});

describe('addMessage', () => {
  it('appends a message and returns its id', async () => {
    const id = await repo.addMessage({
      role: 'agent',
      content: 'How can I help?',
      createdAt: '2026-09-28T17:00:00.000Z',
    });

    expect(id).toBeTruthy();
    const messages = await repo.getAllMessages();
    expect(messages.some((m) => m.id === id)).toBe(true);
  });
});

describe('subscribe', () => {
  it('delivers ordered history immediately and after single and batch appends', async () => {
    repo = new InMemoryMessageRepository([
      { role: 'customer', content: 'Later', createdAt: '2026-11-24T12:02:00.000Z' },
      { role: 'agent', content: 'First', createdAt: '2026-11-24T12:00:00.000Z' },
    ]);
    const snapshots: string[][] = [];
    const unsubscribe = repo.subscribe((msgs) => {
      snapshots.push(msgs.map((message) => message.content));
    });

    expect(snapshots).toEqual([['First', 'Later']]);

    await repo.addMessage({
      role: 'agent',
      content: 'Middle',
      createdAt: '2026-11-24T12:01:00.000Z',
    });
    await repo.addMessages([
      { role: 'customer', content: 'Last', createdAt: '2026-11-24T12:03:00.000Z' },
      { role: 'agent', content: 'Before all', createdAt: '2026-11-24T11:59:00.000Z' },
    ]);

    expect(snapshots).toEqual([
      ['First', 'Later'],
      ['First', 'Middle', 'Later'],
      ['Before all', 'First', 'Middle', 'Later', 'Last'],
    ]);
    unsubscribe();
  });

  it('delivers an empty initial snapshot when no messages have been saved', () => {
    repo = new InMemoryMessageRepository([]);
    const subscriber = vi.fn();
    const unsubscribe = repo.subscribe(subscriber);

    expect(subscriber).toHaveBeenCalledExactlyOnceWith([]);
    unsubscribe();
  });

  it('stops receiving updates after unsubscribing', async () => {
    let callCount = 0;
    const unsubscribe = repo.subscribe(() => {
      callCount++;
    });
    expect(callCount).toBe(1);
    unsubscribe();

    await repo.addMessage({ role: 'agent', content: 'Hi', createdAt: '2026-09-28T17:00:00.000Z' });

    expect(callCount).toBe(1);
  });
});

describe('addMessages', () => {
  it('appends all messages', async () => {
    await repo.addMessages([
      { role: 'agent', content: 'First', createdAt: '2026-09-28T18:00:00.000Z' },
      { role: 'customer', content: 'Second', createdAt: '2026-09-28T18:01:00.000Z' },
    ]);

    const messages = await repo.getAllMessages();
    expect(messages).toHaveLength(4);
    expect(messages.some((m) => m.content === 'First')).toBe(true);
    expect(messages.some((m) => m.content === 'Second')).toBe(true);
  });
});

describe('addMessageIfLastMatches', () => {
  let expectedLastMessageId: string;
  const reply: Omit<Message, 'id'> = {
    role: 'customer',
    content: 'My order number is 123.',
    createdAt: '2026-11-24T12:01:00.000Z',
  };

  beforeEach(async () => {
    repo = new InMemoryMessageRepository([]);
    expectedLastMessageId = await repo.addMessage({
      role: 'agent',
      content: 'What is your order number?',
      createdAt: '2026-11-24T12:00:00.000Z',
    });
  });

  it('saves the reply and notifies subscribers when the expected message is still last', async () => {
    const subscriber = vi.fn();
    repo.subscribe(subscriber);
    subscriber.mockClear();

    const id = await repo.addMessageIfLastMatches(reply, expectedLastMessageId);

    expect(id).toEqual(expect.any(String));
    const messages = await repo.getAllMessages();
    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({ ...reply, id });
    expect(subscriber).toHaveBeenCalledExactlyOnceWith(messages);
  });

  it('leaves messages and subscribers unchanged when the expected message is stale', async () => {
    await repo.addMessage({ ...reply, role: 'agent', content: 'Let me clarify my question.' });
    const before = await repo.getAllMessages();
    const subscriber = vi.fn();
    repo.subscribe(subscriber);
    subscriber.mockClear();

    expect(await repo.addMessageIfLastMatches(reply, expectedLastMessageId)).toBeNull();
    expect(await repo.getAllMessages()).toEqual(before);
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('saves only one reply when two requests answer the same latest message', async () => {
    const ids = await Promise.all([
      repo.addMessageIfLastMatches(reply, expectedLastMessageId),
      repo.addMessageIfLastMatches(reply, expectedLastMessageId),
    ]);

    expect(ids.filter((id) => id !== null)).toHaveLength(1);
    expect(await repo.getAllMessages()).toHaveLength(2);
  });
});
