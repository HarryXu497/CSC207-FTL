import type { MessageSentiment } from 'src/entities';
import type { SentimentRepository } from './SentimentRepository';

export class InMemorySentimentRepository implements SentimentRepository {
  private readonly sentiments = new Map<string, MessageSentiment[]>();

  async getSentimentForCall(callId: string): Promise<MessageSentiment[] | null> {
    return this.sentiments.get(callId) ?? null;
  }

  async setSentiment(callId: string, messageSentiments: MessageSentiment[]): Promise<void> {
    this.sentiments.set(callId, messageSentiments);
  }

  async deleteSentimentForCall(callId: string): Promise<void> {
    this.sentiments.delete(callId);
  }
}
