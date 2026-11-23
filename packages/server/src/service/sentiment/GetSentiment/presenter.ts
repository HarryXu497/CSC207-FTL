import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { GetSentimentOutputBoundary, GetSentimentOutputData } from './output';

export class GetSentimentPresenter implements GetSentimentOutputBoundary {
  constructor(private readonly res: Response<WithError<GetSentimentOutputData>>) {}

  present(output: GetSentimentOutputData): void {
    this.res.json(output);
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }

  presentServiceUnavailable(): void {
    this.res.status(503).json({
      error: {
        message: 'Saving sentiment results is not configured on this server.',
      },
    });
  }
}
