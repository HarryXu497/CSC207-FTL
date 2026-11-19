import type { UploadDocumentOutputBoundary } from './output';

export interface UploadDocumentInputBoundary {
  handle(input: UploadDocumentInputData, presenter: UploadDocumentOutputBoundary): Promise<void>;
}

export interface UploadDocumentInputData {
  file: {
    /** Server-side path assigned by the upload middleware. */
    path: string;
    filename: string;
    originalName: string;
    size: number;
  } | null;
}
