import type { Response } from 'express';
import type { ListMessagesOutputBoundary, ListMessagesOutputData } from './output';
import type { WithError } from 'src/entities';

export class ListMessagesPresenter implements ListMessagesOutputBoundary {
  constructor(private readonly res: Response<WithError<ListMessagesOutputData>>) {}

  present(output: ListMessagesOutputData): void {
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
}
