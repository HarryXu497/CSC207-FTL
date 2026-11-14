import type { Response } from 'express';
import type { ListCallsSentimentOutputBoundary, ListCallsSentimentOutputData } from './output';
import type { WithError } from 'src/entities';

export class ListCallSentimentsPresenter implements ListCallsSentimentOutputBoundary {
  constructor(private readonly res: Response<WithError<ListCallsSentimentOutputData>>) {}

  present(output: ListCallsSentimentOutputData): void {
    this.res.json(output);
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({
      error: {
        message,
      },
    });
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({
      error: {
        message,
      },
    });
  }

  presentServiceUnavailable(): void {
    this.res.status(503).json({
      error: {
        message: 'Sentiment analysis is not available.',
      },
    });
  }
}
