import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { StreamMessagesOutputBoundary, StreamMessagesOutputData } from './output';

export class StreamMessagesPresenter implements StreamMessagesOutputBoundary {
  constructor(private readonly res: Response<WithError<StreamMessagesOutputData>>) {}

  start(): void {
    if (this.res.destroyed || this.res.writableEnded || this.res.headersSent) {
      return;
    }
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
  }

  present({ messages }: StreamMessagesOutputData): void {
    if (this.res.destroyed || this.res.writableEnded) return;
    this.start();
    this.res.write(`data: ${JSON.stringify(messages)}\n\n`);
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }
}
