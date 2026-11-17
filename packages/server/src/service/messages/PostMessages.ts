import type { Message } from 'src/entities';
import type { MessageRepository } from 'src/repository';

export interface CreateMessageRequest {
  role: 'agent' | 'customer';
  content: string;
}

export interface CreateMessageResponse {
  message: Message;
}

export class PostMessages {
  constructor(private readonly messageRepo: MessageRepository) {}

  async handle(message: Omit<Message, 'id'>): Promise<string> {
    return await this.messageRepo.addMessage(message);
  }
}
