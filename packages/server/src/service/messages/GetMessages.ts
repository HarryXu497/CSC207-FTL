import type { Message } from '@recall/shared';
import type { MessageRepository } from 'src/repository';

export class GetMessages {
  constructor(private readonly messageRepo: MessageRepository) {}

  async handle(): Promise<Message[]> {
    return await this.messageRepo.getAllMessages();
  }
}
