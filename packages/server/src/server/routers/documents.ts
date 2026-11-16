import type { ServerResponse, UploadDocumentResponse } from '@recall/shared';
import { Router, type Response } from 'express';
import { documentUpload, handleUploadErrors } from '../middleware';

export function createDocumentsRouter(): Router {
  const router = Router();

  router.post(
    '/documents',
    documentUpload.single('file'),
    (req, res: Response<ServerResponse<UploadDocumentResponse>>) => {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: { message: 'A document file is required.' } });
        return;
      }

      res.status(201).json({
        document: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
        },
      });
    },
  );

  router.use(handleUploadErrors);

  return router;
}
