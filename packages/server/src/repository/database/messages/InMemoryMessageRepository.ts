/**
 * In memory implementation of the data layer
 */
import type { Message } from 'src/entities';
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
  private readonly subscribers = new Set<(messages: Message[]) => void>();

  constructor(seed: Omit<Message, 'id'>[] = SEED) {
    for (const message of seed) {
      this.messages.push({ id: crypto.randomUUID(), ...message });
    }
  }

  /**
   * Get all messages, ordered by creation time ascending.
   * @returns a list of all messages
   */
  async getAllMessages(): Promise<Message[]> {
    return [...this.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Appends a single message, automatically generating the id.
   * @param message - The message to append
   * @returns the id of the created message
   */
  async addMessage(message: Omit<Message, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    this.messages.push({ id, ...message });
    this.subscribers.forEach((cb) => cb([...this.messages]));
    return id;
  }

  /**
   * Appends multiple messages in one batch, automatically generating the ids.
   * @param messages - The messages to append
   */
  async addMessages(messages: Omit<Message, 'id'>[]): Promise<void> {
    for (const message of messages) {
      this.messages.push({ id: crypto.randomUUID(), ...message });
    }
    this.subscribers.forEach((cb) => cb([...this.messages]));
  }

  /**
   * Subscribes to message updates.
   * @param callback - Called with all messages whenever a message is appended
   * @returns an unsubscribe function
   */
  subscribe(callback: (messages: Message[]) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
