import type { AccuracyRepository, CallRepository } from 'src/repository';

export class DeleteCall {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly accuracyRepo?: AccuracyRepository,
  ) {}

  async handle(callId: string): Promise<void> {
    await this.callsRepo.deleteCall(callId);
    // A call's accuracy result has no meaning without the call, so it goes with it.
    await this.accuracyRepo?.deleteAccuracyForCall(callId);
  }
}
