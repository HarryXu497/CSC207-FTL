import type { SentimentTarget } from '../target';
import type { ListCallSentimentsOutputBoundary } from './output';

export interface ListCallSentimentsInputBoundary {
  handle(
    input: ListCallSentimentsInputData,
    presenter: ListCallSentimentsOutputBoundary,
  ): Promise<void>;
}

export interface ListCallSentimentsInputData {
  /** The id of the call or branch whose stored transcript is analyzed. */
  id: string;
  target: SentimentTarget;
}
