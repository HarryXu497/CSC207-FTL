import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { GetBranchOutputBoundary, GetBranchOutputData } from './output';

export class GetBranchPresenter implements GetBranchOutputBoundary {
  constructor(private readonly res: Response<WithError<GetBranchOutputData>>) {}

  present(output: GetBranchOutputData): void {
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
