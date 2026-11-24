import type { StreamMessagesOutputBoundary } from './output';

export interface StreamMessagesInputBoundary {
  /** Returns cleanup for the subscription, or null when the target is invalid. */
  handle(
    input: StreamMessagesInputData,
    presenter: StreamMessagesOutputBoundary,
  ): Promise<(() => void) | null>;
}

export interface StreamMessagesInputData {
  callId: string;
  branchId?: string;
}
