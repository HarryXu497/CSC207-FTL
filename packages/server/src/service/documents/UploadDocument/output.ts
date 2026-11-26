import type { IngestedDocument } from 'src/entities';

export interface UploadDocumentOutputBoundary {
  present(output: UploadDocumentOutputData): void;
  presentBadRequest(message: string): void;
  presentServiceUnavailable(): void;
}

export interface UploadDocumentOutputData {
  document: IngestedDocument;
}
