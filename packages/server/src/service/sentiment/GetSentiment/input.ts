import type { SentimentTarget } from '../target';
import type { GetSentimentOutputBoundary } from './output';

export interface GetSentimentInputBoundary {
  handle(input: GetSentimentInputData, presenter: GetSentimentOutputBoundary): Promise<void>;
}

export interface GetSentimentInputData {
  /** The id of the call or branch whose saved result is read. */
  id: string;
  target: SentimentTarget;
}
