import { Router, type Response } from 'express';
import type { UploadDocumentResponse, WithError } from 'src/entities';
import type { Ingestor } from 'src/repository';
import { UploadDocumentInteractor, UploadDocumentPresenter } from 'src/service';
import { documentUpload, handleUploadErrors } from '../middleware';

export function createDocumentsRouter(ingestor: Ingestor | null): Router {
  const router = Router();

  if (!ingestor) {
    router.post('/documents', (_req, res: Response<WithError<UploadDocumentResponse>>) => {
      new UploadDocumentPresenter(res).presentServiceUnavailable();
    });
    return router;
  }

  const uploadDocument = new UploadDocumentInteractor(ingestor);

  router.post(
    '/documents',
    documentUpload.single('file'),
    async (req, res: Response<WithError<UploadDocumentResponse>>) => {
      const file = req.file;

      await uploadDocument.handle(
        {
          file: file
            ? {
                path: file.path,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
              }
            : null,
        },
        new UploadDocumentPresenter(res),
      );
    },
  );

  router.use(handleUploadErrors);

  return router;
}
