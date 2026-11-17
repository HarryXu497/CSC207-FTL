import type { Message } from 'src/entities';
import type { MessageRepository } from 'src/repository';

export interface GetMessagesResponse {
  messages: Message[];
}

export class GetMessages {
  constructor(private readonly messageRepo: MessageRepository) {}

  async handle(): Promise<Message[]> {
    return await this.messageRepo.getAllMessages();
  }
}
