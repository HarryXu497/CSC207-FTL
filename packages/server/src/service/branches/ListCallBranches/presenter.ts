import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { ListCallBranchesOutputBoundary, ListCallBranchesOutputData } from './output';

export class ListCallBranchesPresenter implements ListCallBranchesOutputBoundary {
  constructor(private readonly res: Response<WithError<ListCallBranchesOutputData>>) {}

  present(output: ListCallBranchesOutputData): void {
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
