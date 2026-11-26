/** Metadata for a document saved by the upload middleware. */
export interface UploadedDocument {
  filename: string;
  originalName: string;
  size: number;
}

export interface UploadedDocumentFile extends UploadedDocument {
  /** Server-side path assigned by the upload middleware. */
  path: string;
}

export interface IngestedDocument extends UploadedDocument {
  chunksStored: number;
}
