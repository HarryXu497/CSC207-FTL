import type { MessageSentiment } from 'src/entities';
import { Firebase } from '../utils';
import type { SentimentRepository } from './SentimentRepository';

interface SentimentDocument {
  messageSentiments: MessageSentiment[];
}

export class FirestoreSentimentRepository implements SentimentRepository {
  static readonly COLLECTION = 'sentiment';

  /**
   * Gets the saved sentiment for a specific call.
   * @param callId - The id of the call (or branch) to get sentiment for
   * @returns the message sentiments saved for the call, or null if it has not been analyzed
   */
  async getSentimentForCall(callId: string): Promise<MessageSentiment[] | null> {
    const snapshot = await this.docFor(callId).get();
    if (!snapshot.exists) {
      return null;
    }

    return (snapshot.data() as SentimentDocument).messageSentiments;
  }

  /**
   * Saves the message sentiments for a call, overwriting any earlier result.
   * @param callId - The id of the call (or branch) the sentiments belong to
   * @param messageSentiments - The sentiments to save
   */
  async setSentiment(callId: string, messageSentiments: MessageSentiment[]): Promise<void> {
    const document: SentimentDocument = { messageSentiments };
    await this.docFor(callId).set(document);
  }

  /**
   * Deletes the saved sentiment for a call.
   * @param callId - The id of the call (or branch) to delete sentiment for
   */
  async deleteSentimentForCall(callId: string): Promise<void> {
    await this.docFor(callId).delete();
  }

  private docFor(callId: string) {
    return Firebase.getInstance().collection(FirestoreSentimentRepository.COLLECTION).doc(callId);
  }
}
