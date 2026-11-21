import type { SentimentRepository } from 'src/repository';
import type { GetSentimentInputBoundary, GetSentimentInputData } from './input';
import type { GetSentimentOutputBoundary } from './output';

export class GetSentimentInteractor implements GetSentimentInputBoundary {
  constructor(private readonly repo: SentimentRepository) {}

  async handle(
    { callId }: GetSentimentInputData,
    presenter: GetSentimentOutputBoundary,
  ): Promise<void> {
    const messageSentiments = await this.repo.getSentimentForCall(callId);

    if (messageSentiments === null) {
      presenter.presentNotFound(`Call ${callId} has not been analyzed for sentiment yet.`);
      return;
    }

    presenter.present({ messageSentiments });
  }
}
