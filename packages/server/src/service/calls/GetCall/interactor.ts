import type { CallRepository } from 'src/repository';
import type { GetCallInputBoundary, GetCallInputData } from './input';
import type { GetCallOutputBoundary } from './output';
import { NotFoundError } from 'src/errors';

export class GetCallInteractor implements GetCallInputBoundary {
  constructor(private readonly callRepo: CallRepository) {}

  async handle({ callId }: GetCallInputData, presenter: GetCallOutputBoundary): Promise<void> {
    try {
      const call = await this.callRepo.getCall(callId);
      presenter.present({ call });
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(e.message);
        return;
      }

      throw e;
    }
  }
}
