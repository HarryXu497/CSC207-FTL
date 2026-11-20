import type { Response } from 'express';
import type { DeleteCallOutputBoundary } from './output';
import type { WithError } from 'src/entities';

export class DeleteCallPresenter implements DeleteCallOutputBoundary {
  constructor(private readonly res: Response<WithError<never>>) {}

  present(): void {
    this.res.status(204).send();
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }
}