/**
 * Unit tests
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMessageRepository } from './InMemoryMessageRepository';

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
