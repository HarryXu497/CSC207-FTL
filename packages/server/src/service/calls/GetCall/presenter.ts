import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { GetCallOutputBoundary, GetCallOutputData } from './output';

export class GetCallPresenter implements GetCallOutputBoundary {
  constructor(private readonly res: Response<WithError<GetCallOutputData>>) {}

  present(output: GetCallOutputData): void {
    this.res.json(output);
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }
}
