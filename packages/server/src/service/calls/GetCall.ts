import type { Call } from 'src/entities';
import type { CallRepository } from 'src/repository';

export interface GetCallResponse {
  call: Call;
}

export class GetCall {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(callId: string): Promise<Call> {
    return await this.callsRepo.getCall(callId);
  }
}
