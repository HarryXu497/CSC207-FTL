import type { Call } from 'src/entities';
import type { CallRepository } from 'src/repository';

export interface GetCallsResponse {
  calls: Call[];
}

export class GetCalls {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(): Promise<Call[]> {
    return await this.callsRepo.getAllCalls();
  }
}
