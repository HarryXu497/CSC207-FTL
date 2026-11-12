import type { Message } from '@recall/shared';
import type { MessageRepository } from 'src/repository';

export class PostMessages {
  constructor(private readonly messageRepo: MessageRepository) {}

  async handle(message: Omit<Message, 'id'>): Promise<string> {
    return await this.messageRepo.addMessage(message);
  }
}
