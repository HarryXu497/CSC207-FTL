import type { Call } from 'src/entities';
import type { CallRepository } from 'src/repository';

export interface CreateCallRequest {
  customerName: string;
  topic: string;
}

export interface CreateCallResponse {
  call: Call;
}

export class PostCalls {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(call: Call): Promise<void> {
    await this.callsRepo.setCall(call);
  }
}
