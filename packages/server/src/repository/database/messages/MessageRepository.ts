import type { Message } from '@recall/shared';

/**
 * Represents a repository object that operates with messages.
 */
export interface MessageRepository {
  /**
   * Get all messages, ordered by creation time ascending.
   * @returns a list of all messages
   */
  getAllMessages(): Promise<Message[]>;

  /**
   * Appends a single message, automatically generating the id.
   * @param message - The message to append
   * @returns the id of the created messages
   */
  addMessage(message: Omit<Message, "id">): Promise<string>;

  /**
   * Appends multiple messages in one batch, automatically
   * generating the ids.
   * @param messages - The messages to append
   */
  addMessages(messages: Message[]): Promise<void>;
}
