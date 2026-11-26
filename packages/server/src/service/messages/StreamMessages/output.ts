import type { Message } from 'src/entities';

export interface StreamMessagesOutputBoundary {
  /** Prepare the streaming response after the target has been validated. */
  start(): void;
  present(output: StreamMessagesOutputData): void;
  presentBadRequest(message: string): void;
  presentNotFound(message: string): void;
}

export interface StreamMessagesOutputData {
  messages: Message[];
}
