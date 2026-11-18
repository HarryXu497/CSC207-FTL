import { NotFoundError } from 'src/errors';
import type { CallRepository, MessageRepository } from 'src/repository';
import type { ListMessagesInputBoundary, ListMessagesInputData } from './input';
import type { ListMessagesOutputBoundary } from './output';

export class ListMessagesInteractor implements ListMessagesInputBoundary {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async handle(
    { callId }: ListMessagesInputData,
    presenter: ListMessagesOutputBoundary,
  ): Promise<void> {
    try {
      await this.callsRepo.getCall(callId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Call with id ${callId} not found.`);
        return;
      }
    }

    const messages = await this.messageRepo.getAllMessages();

    presenter.present({ messages });
  }
}
