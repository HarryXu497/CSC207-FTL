import type { Call } from '@recall/shared';
import type { CallRepository } from 'src/repository';

export class GetCalls {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(): Promise<Call[]> {
    return await this.callsRepo.getAllCalls();
  }
}
