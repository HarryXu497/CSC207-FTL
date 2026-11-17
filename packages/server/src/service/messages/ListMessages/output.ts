import type {Message} from 'src/entities';

export interface ListMessagesOutputBoundary {
  present(output: ListMessagesOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
  presentServiceUnavailable(): void;
}

export interface ListMessagesOutputData {
  messages: Message[];
}