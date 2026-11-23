import type { IngestedDocument } from '../documents';

/** POST /api/documents (multipart field: file) */
export interface UploadDocumentResponse {
  document: IngestedDocument;
}
