import type { ListCallsSentimentOutputBoundary } from './output';

export interface ListCallsSentimentInputBoundary {
  handle(
    input: ListCallsSentimentInputData,
    presenter: ListCallsSentimentOutputBoundary,
  ): Promise<void>;
}

export interface ListCallsSentimentInputData {
  callId: string;
}
