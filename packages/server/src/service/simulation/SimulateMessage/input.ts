import type { SimulateMessageOutputBoundary } from './output';

export interface SimulateMessageInputBoundary {
  handle(input: SimulateMessageInputData, presenter: SimulateMessageOutputBoundary): Promise<void>;
}

export interface SimulateMessageInputData {
  callId: string;
  branchId: string;
  /** The saved agent message that the customer reply should answer. */
  expectedLastMessageId: string;
}
