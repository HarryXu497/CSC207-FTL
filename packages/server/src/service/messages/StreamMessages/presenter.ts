import type { Response } from 'express';
import type { StreamMessagesOutputBoundary, StreamMessagesOutputData } from './output';

/**
 * Presents message updates through an Express response
 * Keeps HTTP headers, formatting and status codes outside the use case
 */
export class StreamMessagesPresenter implements StreamMessagesOutputBoundary {
  /**
   * @param res - The Express response used to stream updates to the client
   */
  constructor(private readonly res: Response) {}

  /**
   * Sets the headers for a server sent event response
   * The connection stays open so multiple message updates can be sent
   */
  start(): void {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
  }

  /**
   * Sends the messages as a JSON within an server sent event
   * @param output - The message update
   */
  present({ messages }: StreamMessagesOutputData): void {
    this.res.write(`data: ${JSON.stringify(messages)}\n\n`);
  }

  /**
   * Sends an HTTP 400 response when the request is invalid.
   * @param message - A description of what is invalid about the request.
   */
  presentBadRequest(message: string): void {
    this.res.status(400).json({
      error: {
        message,
      },
    });
  }
}
