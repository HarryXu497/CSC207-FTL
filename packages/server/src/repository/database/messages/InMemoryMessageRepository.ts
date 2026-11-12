/**
 * In memory implementation of the data layer
 */
import type { Message } from '@recall/shared';
import type { MessageRepository } from './MessageRepository';

/** Demo rows */
const SEED: Omit<Message, 'id'>[] = [
  {
    role: 'agent',
    content: 'Hello, how can I help you today?',
    createdAt: '2026-09-28T16:05:00.000Z',
  },
  {
    role: 'customer',
    content: 'I have a problem with my account.',
    createdAt: '2026-09-28T16:05:30.000Z',
  },
];

export class InMemoryMessageRepository implements MessageRepository {
  private readonly messages: Message[] = [];

  constructor(seed: Omit<Message, 'id'>[] = SEED) {
    for (const message of seed) {
      this.messages.push({ id: crypto.randomUUID(), ...message });
    }
  }

  async getAllMessages(): Promise<Message[]> {
    return [...this.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async addMessage(message: Omit<Message, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    this.messages.push({ id, ...message });
    return id;
  }

  async addMessages(messages: Omit<Message, 'id'>[]): Promise<void> {
    for (const message of messages) {
      this.messages.push({ id: crypto.randomUUID(), ...message });
    }
  }
}
