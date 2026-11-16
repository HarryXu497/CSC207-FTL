import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { documentFileFilter, UnsupportedDocumentTypeError } from './upload';

function filterFile(originalname: string) {
  const callback = vi.fn<(error: Error | null, acceptFile?: boolean) => void>();
  documentFileFilter({} as Request, { originalname } as Express.Multer.File, callback);
  return callback;
}

describe('documentFileFilter', () => {
  it.each(['notes.txt', 'policy.md', 'handbook.pdf', 'NOTES.TXT', 'POLICY.MD', 'HANDBOOK.PDF'])(
    'accepts supported document %s',
    (filename) => {
      const callback = filterFile(filename);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(null, true);
    },
  );

  it.each(['program.exe', 'handbook.pdf.exe', 'handbook', 'handbook.pdf.', '.pdf'])(
    'rejects unsupported filename %s',
    (filename) => {
      const callback = filterFile(filename);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.any(UnsupportedDocumentTypeError));
    },
  );
});
