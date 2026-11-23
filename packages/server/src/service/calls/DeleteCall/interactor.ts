import type { AccuracyRepository, CallRepository, SentimentRepository } from 'src/repository';
import type { DeleteCallInputBoundary, DeleteCallInputData } from './input';
import type { DeleteCallOutputBoundary } from './output';
import { NotFoundError } from 'src/errors';

export class DeleteCallInteractor implements DeleteCallInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly accuracyRepo: AccuracyRepository | null = null,
    private readonly sentimentRepo: SentimentRepository | null = null,
  ) {}

  async handle(
    { callId }: DeleteCallInputData,
    presenter: DeleteCallOutputBoundary,
  ): Promise<void> {
    try {
      await this.callRepo.getCall(callId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Call with id ${callId} not found.`);
        return;
      }

      throw e;
    }

    await this.callRepo.deleteCall(callId);
    await this.accuracyRepo?.deleteAccuracyForCall(callId);
    await this.sentimentRepo?.deleteSentimentForCall(callId);

    presenter.present();
  }
}
