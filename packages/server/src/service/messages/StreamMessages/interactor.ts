import type { MessageRepository } from 'src/repository';
import type { StreamMessagesInputBoundary } from './input';
import type { StreamMessagesOutputBoundary } from './output';


/**
 * Subscribes to message updates and passes them to the presenter
 */
export class StreamMessagesInteractor implements StreamMessagesInputBoundary {

  /**
   * @param messageRepo - The repository that provides message updates.
   */
  constructor(private readonly messageRepo: MessageRepository) { }

  /**
   * Starts the stream and subscribes to message updates
   *
   * @param presenter - Prepares the stream and presents each message update
   * @returns A function the caller must call in order to unsubscribe when needed
   */
  handle(presenter: StreamMessagesOutputBoundary): () => void {
    presenter.start();

    return this.messageRepo.subscribe((messages) => {
      presenter.present({ messages });
    });
  }
}
