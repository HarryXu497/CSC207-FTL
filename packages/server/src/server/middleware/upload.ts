import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { extname } from 'node:path';

// Match the document formats supported by ChromaIngestor.
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.pdf'] as const;

// Maximum size of one uploaded document: 10 MiB.
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export class UnsupportedDocumentTypeError extends Error {
  constructor() {
    super(`Allowed document extensions: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}.`);
    this.name = 'UnsupportedDocumentTypeError';
  }
}

export function documentFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  const extension = extname(file.originalname).toLowerCase();

  if (!ALLOWED_DOCUMENT_EXTENSIONS.some((allowed) => allowed === extension)) {
    callback(new UnsupportedDocumentTypeError());
    return;
  }

  callback(null, true);
}
