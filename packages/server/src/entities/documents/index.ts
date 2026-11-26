/** Metadata for a document saved by the upload middleware. */
export interface UploadedDocument {
  filename: string;
  originalName: string;
  size: number;
}
