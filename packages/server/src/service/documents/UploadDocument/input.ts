import type { UploadedDocumentFile } from 'src/entities';
import type { UploadDocumentOutputBoundary } from './output';

export interface UploadDocumentInputBoundary {
  handle(input: UploadDocumentInputData, presenter: UploadDocumentOutputBoundary): Promise<void>;
}

export interface UploadDocumentInputData {
  file: UploadedDocumentFile;
}
