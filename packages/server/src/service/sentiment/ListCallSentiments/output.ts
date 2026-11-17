import type { MessageSentiment } from 'src/entities';

export interface ListCallsSentimentOutputBoundary {
  present(output: ListCallsSentimentOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
  presentServiceUnavailable(): void;
}

export interface ListCallsSentimentOutputData {
  messageSentiments: MessageSentiment[];
}
