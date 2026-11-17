import type { CallRepository } from 'src/repository';

export class DeleteCall {
  constructor(private readonly callsRepo: CallRepository) {}

  async handle(callId: string): Promise<void> {
    await this.callsRepo.deleteCall(callId);
  }
}
