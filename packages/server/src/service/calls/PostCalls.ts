import type { Call } from '@recall/shared';
import type { CallRepository } from 'src/repository';

export class PostCalls {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(call: Call): Promise<void> {
    await this.callsRepo.setCall(call);
  }
}
