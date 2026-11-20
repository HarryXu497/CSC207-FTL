import type { AccuracyRepository } from 'src/repository';
import type { GetAccuracyInputBoundary, GetAccuracyInputData } from './input';
import type { GetAccuracyOutputBoundary } from './output';

export class GetAccuracyInteractor implements GetAccuracyInputBoundary {
  constructor(private readonly repo: AccuracyRepository) {}

  async handle(
    { callId }: GetAccuracyInputData,
    presenter: GetAccuracyOutputBoundary,
  ): Promise<void> {
    const accuracy = await this.repo.getAccuracyForCall(callId);

    if (accuracy === null) {
      presenter.presentNotFound(`Call ${callId} has not been analyzed for accuracy yet.`);
      return;
    }

    presenter.present({ accuracy });
  }
}
