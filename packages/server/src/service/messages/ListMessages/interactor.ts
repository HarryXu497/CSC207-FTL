import { NotFoundError } from 'src/errors';
import type { CallRepository } from 'src/repository';
import {
  FirestoreCallRepository,
  type MessageRepositoryBuilder,
} from 'src/repository';
import type { ListMessagesInputBoundary, ListMessagesInputData } from './input';
import type { ListMessagesOutputBoundary } from './output';

export class ListMessagesInteractor implements ListMessagesInputBoundary {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
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
      }
    }
    
    const messages = await this.messageRepoFactory(
      FirestoreCallRepository.COLLECTION,
      callId,
    ).getAllMessages();

    presenter.present({ messages });
  }
}
