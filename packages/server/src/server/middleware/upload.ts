// Match the document formats supported by ChromaIngestor.
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.pdf'] as const;

// Maximum size of one uploaded document: 10 MiB.
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
