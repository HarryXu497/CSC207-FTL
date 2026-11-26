import type { Message } from 'src/entities';

/**
 * The contract for presenting message-streaming results.
 * Keeps response handling outside the use case so it does not depend on Express.
 */
export interface StreamMessagesOutputBoundary {
  /** Prepares the streaming response to begin streaming messages (before any messages arrive).*/
  start(): void;
  /** Sends a message update to the client. */
  present(output: StreamMessagesOutputData): void;
  /** Reports invalid request data to the client. */
  presentBadRequest(message: string): void;
}

/**
 * The data passed from the streaming use case to the presenter.
 */
export interface StreamMessagesOutputData {
  //the messages included in the current update of the database
  messages: Message[];
}
