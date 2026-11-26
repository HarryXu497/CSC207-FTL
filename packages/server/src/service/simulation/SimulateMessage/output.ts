import type { Message } from 'src/entities';

export interface SimulateMessageOutputBoundary {
  present(output: SimulateMessageOutputData): void;
  presentBadRequest(message: string): void;
  presentNotFound(message: string): void;
  presentConflict(message: string): void;
  presentServiceUnavailable(): void;
}

export interface SimulateMessageOutputData {
  /** The customer message after it has been saved to the branch. */
  message: Message;
}
