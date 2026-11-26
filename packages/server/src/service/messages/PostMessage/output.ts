import type { Message } from 'src/entities';

export interface PostMessageOutputBoundary {
  present(output: PostMessageOutputData): void;
  presentBadRequest(message: string): void;
  presentNotFound(message: string): void;
}

export interface PostMessageOutputData {
  message: Message;
}
