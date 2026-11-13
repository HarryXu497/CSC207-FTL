import type { Call } from '@recall/shared';
import type { CallRepository } from 'src/repository';

export class GetCall {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(callId: string): Promise<Call> {
    return await this.callsRepo.getCall(callId);
  }
}
