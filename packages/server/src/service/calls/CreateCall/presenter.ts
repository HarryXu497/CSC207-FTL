import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { CreateCallOutputBoundary, CreateCallOutputData } from './output';

export class CreateCallPresenter implements CreateCallOutputBoundary {
  constructor(private readonly res: Response<WithError<CreateCallOutputData>>) {}

  present(output: CreateCallOutputData): void {
    this.res.status(201).json(output);
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({
      error: {
        message,
      },
    });
  }
}
