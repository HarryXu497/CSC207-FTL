import type { ListCallSentimentsOutputBoundary } from './output';

export interface ListCallSentimentsInputBoundary {
  handle(
    input: ListCallSentimentsInputData,
    presenter: ListCallSentimentsOutputBoundary,
  ): Promise<void>;
}

export interface ListCallSentimentsInputData {
  callId: string;
}
