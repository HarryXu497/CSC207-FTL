import type { Message } from 'src/entities';
import type { PostMessageOutputBoundary } from './output';

export interface PostMessageInputBoundary {
  handle(input: PostMessageInputData, presenter: PostMessageOutputBoundary): Promise<void>;
}

export interface PostMessageInputData {
  callId: string;
  /** Omit to post to the original call. */
  branchId?: string;
  messageData: Pick<Message, 'role' | 'content'>;
}
