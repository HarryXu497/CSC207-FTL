import type { Call } from 'src/entities';
import { NotFoundError } from 'src/errors';
import {
  FirestoreBranchRepository,
  FirestoreCallRepository,
  type AnalyseMessages,
  type BranchRepository,
  type CallRepository,
  type MessageRepositoryBuilder,
  type MessageResult,
  type SentimentRepository,
} from 'src/repository';
import { TARGET_LABELS } from '../target';
import type { ListCallSentimentsInputBoundary, ListCallSentimentsInputData } from './input';
import type { ListCallSentimentsOutputBoundary } from './output';

/**
 * Analyzes the stored transcript of a call or a branch and saves the result under its id. Calls and
 * branches share this use case; only the repository and message collection differ.
 */
export class ListCallSentimentsInteractor implements ListCallSentimentsInputBoundary {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: AnalyseMessages,
    private readonly sentimentRepo: SentimentRepository,
  ) {}

  async handle(
    { id, target }: ListCallSentimentsInputData,
    presenter: ListCallSentimentsOutputBoundary,
  ): Promise<void> {
    try {
      await this.getStored(id, target);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`${TARGET_LABELS[target]} with id ${id} not found.`);
        return;
      }

      throw e;
    }

    const collection =
      target === 'call' ? FirestoreCallRepository.COLLECTION : FirestoreBranchRepository.COLLECTION;
    const messages = await this.messageRepoFactory(collection, id).getAllMessages();

    const results = await this.analyseMessages.handle({
      messages: messages.map((message) => message.content),
    });

    const messageSentiments = messages
      .filter((_, i) => Boolean(results[i]))
      .map((message, i) => {
        const result = results[i] as MessageResult;
        return { messageId: message.id, result };
      });

    await this.sentimentRepo.setSentiment(id, messageSentiments);

    presenter.present({ messageSentiments });
  }

  private getStored(id: string, target: ListCallSentimentsInputData['target']): Promise<Call> {
    return target === 'call' ? this.callsRepo.getCall(id) : this.branchRepo.getBranch(id);
  }
}
