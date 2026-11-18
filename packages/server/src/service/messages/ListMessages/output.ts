import type { Message } from 'src/entities';

export interface ListMessagesOutputBoundary {
  present(output: ListMessagesOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface ListMessagesOutputData {
  messages: Message[];
}
