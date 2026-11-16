/** POST /api/documents (multipart field: file) */
export interface UploadDocumentResponse {
  document: {
    filename: string;
    originalName: string;
    size: number;
  };
}
