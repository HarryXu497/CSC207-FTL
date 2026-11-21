import type { AccuracyRepository, CallRepository, SentimentRepository } from 'src/repository';

export class DeleteCall {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly accuracyRepo?: AccuracyRepository,
    private readonly sentimentRepo?: SentimentRepository,
  ) {}

  async handle(callId: string): Promise<void> {
    await this.callsRepo.deleteCall(callId);
    // A call's saved results have no meaning without the call, so they go with it.
    await this.accuracyRepo?.deleteAccuracyForCall(callId);
    await this.sentimentRepo?.deleteSentimentForCall(callId);
  }
}
