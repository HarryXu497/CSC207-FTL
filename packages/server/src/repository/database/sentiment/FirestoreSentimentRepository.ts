import type { MessageSentiment } from 'src/entities';
import { Firebase } from '../utils';
import type { SentimentRepository } from './SentimentRepository';

/** A Firestore document can't be a bare array, so the sentiments are wrapped in this object. */
interface SentimentDocument {
  messageSentiments: MessageSentiment[];
}

export class FirestoreSentimentRepository implements SentimentRepository {
  static readonly COLLECTION = 'sentiment';

  async getSentimentForCall(callId: string): Promise<MessageSentiment[] | null> {
    const snapshot = await this.docFor(callId).get();
    if (!snapshot.exists) {
      return null;
    }

    return (snapshot.data() as SentimentDocument).messageSentiments;
  }

  async setSentiment(callId: string, messageSentiments: MessageSentiment[]): Promise<void> {
    const document: SentimentDocument = { messageSentiments };
    await this.docFor(callId).set(document);
  }

  async deleteSentimentForCall(callId: string): Promise<void> {
    await this.docFor(callId).delete();
  }

  private docFor(callId: string) {
    return Firebase.getInstance().collection(FirestoreSentimentRepository.COLLECTION).doc(callId);
  }
}
