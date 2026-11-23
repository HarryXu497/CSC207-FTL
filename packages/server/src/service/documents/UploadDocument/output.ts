import type { UploadedDocument } from 'src/entities';

export interface UploadDocumentOutputBoundary {
  present(output: UploadDocumentOutputData): void;
  presentBadRequest(message: string): void;
}

export interface UploadDocumentOutputData {
  document: UploadedDocument;
}
