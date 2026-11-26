import type { SentimentRepository } from 'src/repository';
import { TARGET_LABELS } from '../target';
import type { GetSentimentInputBoundary, GetSentimentInputData } from './input';
import type { GetSentimentOutputBoundary } from './output';

export class GetSentimentInteractor implements GetSentimentInputBoundary {
  constructor(private readonly repo: SentimentRepository) {}

  async handle(
    { id, target }: GetSentimentInputData,
    presenter: GetSentimentOutputBoundary,
  ): Promise<void> {
    const messageSentiments = await this.repo.getSentimentForCall(id);

    if (messageSentiments === null) {
      presenter.presentNotFound(
        `${TARGET_LABELS[target]} ${id} has not been analyzed for sentiment yet.`,
      );
      return;
    }

    presenter.present({ messageSentiments });
  }
}
