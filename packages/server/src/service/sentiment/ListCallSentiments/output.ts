import type { MessageSentiment } from 'src/entities';

export interface ListCallSentimentsOutputBoundary {
  present(output: ListCallSentimentsOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
  presentServiceUnavailable(): void;
}

export interface ListCallSentimentsOutputData {
  messageSentiments: MessageSentiment[];
}
