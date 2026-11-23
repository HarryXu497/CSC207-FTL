import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { UploadDocumentOutputBoundary, UploadDocumentOutputData } from './output';

export class UploadDocumentPresenter implements UploadDocumentOutputBoundary {
  constructor(private readonly res: Response<WithError<UploadDocumentOutputData>>) {}

  present(output: UploadDocumentOutputData): void {
    this.res.status(201).json(output);
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }

  presentServiceUnavailable(): void {
    this.res.status(503).json({ error: { message: 'Document ingestion is not available.' } });
  }
}
