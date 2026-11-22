import type { AccuracyRepository } from 'src/repository';
import { TARGET_LABELS } from '../target';
import type { GetAccuracyInputBoundary, GetAccuracyInputData } from './input';
import type { GetAccuracyOutputBoundary } from './output';

export class GetAccuracyInteractor implements GetAccuracyInputBoundary {
  constructor(private readonly repo: AccuracyRepository) {}

  async handle(
    { id, target }: GetAccuracyInputData,
    presenter: GetAccuracyOutputBoundary,
  ): Promise<void> {
    const accuracy = await this.repo.getAccuracyForCall(id);

    if (accuracy === null) {
      presenter.presentNotFound(
        `${TARGET_LABELS[target]} ${id} has not been analyzed for accuracy yet.`,
      );
      return;
    }

    presenter.present({ accuracy });
  }
}
