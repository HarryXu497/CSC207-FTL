import type { MessageSentiment } from 'src/entities';

/**
 * Stores sentiment results by id. A branch is a call (`Branch extends Call`) with its own id, so a
 * branch's result is stored under its branch id in the same way.
 */
export interface SentimentRepository {
  /**
   * @param callId - The id of the call to get sentiment for
   * @returns the message sentiments saved for the call, or null if it has not been analyzed
   */
  getSentimentForCall(callId: string): Promise<MessageSentiment[] | null>;

  /**
   * Saves the message sentiments for a call, overwriting any earlier result.
   * @param callId - The id of the call the sentiments belong to
   * @param messageSentiments - The sentiments to save
   */
  setSentiment(callId: string, messageSentiments: MessageSentiment[]): Promise<void>;

  /**
   * Deletes the saved sentiment for a call.
   * @param callId - The id of the call to delete sentiment for
   */
  deleteSentimentForCall(callId: string): Promise<void>;
}
