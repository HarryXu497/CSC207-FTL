import type { Message } from 'src/entities';
import type { MessageRepository } from 'src/repository';

export class StreamMessages {
  constructor(private readonly messageRepo: MessageRepository) {}

  handle(callback: (messages: Message[]) => void): () => void {
    return this.messageRepo.subscribe(callback);
  }
}
