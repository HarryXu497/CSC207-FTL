import type { Request } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Same as ChromaIngestor
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.pdf'] as const;
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_DIRECTORY = fileURLToPath(
  new URL('../../../uploads', import.meta.url),
);

export const documentStorage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(DOCUMENT_UPLOAD_DIRECTORY, { recursive: true }, (error) => {
      callback(error, DOCUMENT_UPLOAD_DIRECTORY);
    });
  },
  filename(_req, file, callback) {
    const extension = extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

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
