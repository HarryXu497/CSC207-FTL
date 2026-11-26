import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { PostMessageOutputBoundary, PostMessageOutputData } from './output';

export class PostMessagePresenter implements PostMessageOutputBoundary {
  constructor(private readonly res: Response<WithError<PostMessageOutputData>>) {}

  present(output: PostMessageOutputData): void {
    this.res.status(201).json(output);
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }
}
