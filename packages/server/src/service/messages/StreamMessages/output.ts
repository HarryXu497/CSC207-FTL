import type { Message } from 'src/entities';

export interface StreamMessagesOutputBoundary {
  present(output: StreamMessagesOutputData): void;
  presentBadRequest(message: string): void;
  presentNotFound(message: string): void;
}

export interface StreamMessagesOutputData {
  messages: Message[];
}
