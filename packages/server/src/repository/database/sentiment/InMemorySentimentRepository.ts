import type { MessageSentiment } from 'src/entities';
import type { SentimentRepository } from './SentimentRepository';

export class InMemorySentimentRepository implements SentimentRepository {
  private readonly sentiments = new Map<string, MessageSentiment[]>();

  /**
   * Gets the saved sentiment for a specific call.
   * @param callId - The id of the call (or branch) to get sentiment for
   * @returns the message sentiments saved for the call, or null if it has not been analyzed
   */
  async getSentimentForCall(callId: string): Promise<MessageSentiment[] | null> {
    return this.sentiments.get(callId) ?? null;
  }

  /**
   * Saves the message sentiments for a call, overwriting any earlier result.
   * @param callId - The id of the call (or branch) the sentiments belong to
   * @param messageSentiments - The sentiments to save
   */
  async setSentiment(callId: string, messageSentiments: MessageSentiment[]): Promise<void> {
    this.sentiments.set(callId, messageSentiments);
  }

  /**
   * Deletes the saved sentiment for a call.
   * @param callId - The id of the call (or branch) to delete sentiment for
   */
  async deleteSentimentForCall(callId: string): Promise<void> {
    this.sentiments.delete(callId);
  }
}
