import type { Call, Message } from 'src/entities';
import type { CreateCallOutputBoundary } from './output';

export interface CreateCallInputBoundary {
  handle(input: CreateCallInputData, presenter: CreateCallOutputBoundary): Promise<void>;
}

export interface CreateCallInputData {
  callData: Omit<Call, 'id'>;
  messageData: Omit<Message, 'id'>[];
}
