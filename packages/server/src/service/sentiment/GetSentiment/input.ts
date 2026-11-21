import type { GetSentimentOutputBoundary } from './output';

export interface GetSentimentInputBoundary {
  handle(input: GetSentimentInputData, presenter: GetSentimentOutputBoundary): Promise<void>;
}

export interface GetSentimentInputData {
  callId: string;
}
