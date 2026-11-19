import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { DeleteCallOutputBoundary, DeleteCallOutputData } from './output';

export class DeleteCallPresenter implements DeleteCallOutputBoundary {
  constructor(private readonly res: Response<WithError<DeleteCallOutputData>>) {}

  presentSuccess(output: DeleteCallOutputData): void {
    this.res.status(204).json(output);
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }
}