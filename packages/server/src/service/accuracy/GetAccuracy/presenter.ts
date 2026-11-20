import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { GetAccuracyOutputBoundary, GetAccuracyOutputData } from './output';

export class GetAccuracyPresenter implements GetAccuracyOutputBoundary {
  constructor(private readonly res: Response<WithError<GetAccuracyOutputData>>) {}

  present(output: GetAccuracyOutputData): void {
    this.res.json(output);
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }
}
