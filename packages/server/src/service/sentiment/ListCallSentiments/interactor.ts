import { NotFoundError } from 'src/errors';
import type { CallRepository } from 'src/repository';
import {
  FirestoreCallRepository,
  type AnalyseMessages,
  type MessageRepositoryBuilder,
  type MessageResult,
} from 'src/repository';
import type { ListCallsSentimentInputBoundary, ListCallsSentimentInputData } from './input';
import type { ListCallsSentimentOutputBoundary } from './output';

export class ListCallSentimentInteractor implements ListCallsSentimentInputBoundary {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: AnalyseMessages,
  ) {}

  async handle(
    { callId }: ListCallsSentimentInputData,
    presenter: ListCallsSentimentOutputBoundary,
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

    const results = await this.analyseMessages.handle({
      messages: messages.map((message) => message.content),
    });

    const messageSentiments = messages
      .filter((_, i) => Boolean(results[i]))
      .map((message, i) => {
        const result = results[i] as MessageResult;
        return { messageId: message.id, result };
      });

    presenter.present({ messageSentiments });
  }
}
