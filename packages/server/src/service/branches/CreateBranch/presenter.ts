import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { CreateBranchOutputBoundary, CreateBranchOutputData } from './output';

export class CreateBranchPresenter implements CreateBranchOutputBoundary {
  constructor(private readonly res: Response<WithError<CreateBranchOutputData>>) {}

  present(output: CreateBranchOutputData): void {
    this.res.status(201).json(output);
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
