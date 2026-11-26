import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import type { ApiErrorBody } from 'src/entities';
import { UnsupportedDocumentTypeError } from './upload';

// The list of malformed multipart errors.
const MALFORMED_MULTIPART_ERRORS = new Set([
  'Multipart: Boundary not found',
  'Malformed content type',
  'Malformed part header',
  'Unexpected end of form',
  'Unexpected end of file',
]);

export function handleUploadErrors(
  error: unknown,
  _req: Request,
  res: Response<ApiErrorBody>,
  next: NextFunction,
): void {
  if (error instanceof UnsupportedDocumentTypeError) {
    res.status(415).json({ error: { message: error.message } });
    return;
  }

  if (error instanceof MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ error: { message: error.message } });
    return;
  }

  if (
    error instanceof Error &&
    (MALFORMED_MULTIPART_ERRORS.has(error.message) ||
      error.message.startsWith('Unsupported content type:'))
  ) {
    res
      .status(400)
      .json({ error: { message: 'The upload request contains invalid multipart data.' } });
    return;
  }

  next(error);
}
