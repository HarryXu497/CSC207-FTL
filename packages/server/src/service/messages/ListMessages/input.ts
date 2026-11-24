import type { ListMessagesOutputBoundary } from './output';

export interface ListMessagesInputBoundary {
  handle(input: ListMessagesInputData, presenter: ListMessagesOutputBoundary): Promise<void>;
}

export interface ListMessagesInputData {
  callId: string;
  /** Omit to list the original call's messages. */
  branchId?: string;
}
