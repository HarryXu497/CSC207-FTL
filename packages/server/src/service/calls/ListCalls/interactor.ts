import type { CallRepository } from 'src/repository';
import type { ListCallsInputBoundary } from './input';
import type { ListCallsOutputBoundary } from './output';

export class ListCallsInteractor implements ListCallsInputBoundary {
  constructor(private readonly callRepo: CallRepository) {}

  async handle(presenter: ListCallsOutputBoundary) {
    const calls = await this.callRepo.getAllCalls();

    presenter.present({ calls });
  }
}
