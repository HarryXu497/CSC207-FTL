import type { Message } from 'src/entities';
import type { MessageRepository } from 'src/repository';

export class PostMessagesBatch {
  constructor(private readonly messageRepo: MessageRepository) {}

  async handle(messages: Omit<Message, 'id'>[]): Promise<void> {
    await this.messageRepo.addMessages(messages);
  }
}
