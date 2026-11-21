import type { MessageSentiment } from 'src/entities';

export interface GetSentimentOutputBoundary {
  present(output: GetSentimentOutputData): void;
  presentNotFound(message: string): void;
}

export interface GetSentimentOutputData {
  messageSentiments: MessageSentiment[];
}
