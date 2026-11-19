import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { ListCallSentimentsOutputBoundary, ListCallSentimentsOutputData } from './output';

export class ListCallSentimentsPresenter implements ListCallSentimentsOutputBoundary {
  constructor(private readonly res: Response<WithError<ListCallSentimentsOutputData>>) {}

  present(output: ListCallSentimentsOutputData): void {
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
