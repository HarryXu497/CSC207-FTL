import { Router, type ErrorRequestHandler, type Request, type RequestHandler } from 'express';
import type {} from 'multer';
import {
  UploadDocumentPresenter,
  type UploadDocumentInputBoundary,
  type UploadDocumentOutputBoundary,
} from './UploadDocument';

export class DocumentsController {
  constructor(
    private readonly interactor: UploadDocumentInputBoundary | null,
    private readonly upload: RequestHandler,
    private readonly uploadErrorHandler: ErrorRequestHandler,
  ) {}

  async uploadDocument(req: Request, presenter: UploadDocumentOutputBoundary): Promise<void> {
    if (!this.interactor) {
      presenter.presentServiceUnavailable();
      return;
    }

    const file = req.file;

    if (!file) {
      presenter.presentBadRequest('A document file is required.');
      return;
    }

    await this.interactor.handle(
      {
        file: {
          path: file.path,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
        },
      },
      presenter,
    );
  }

  router(): Router {
    const router = Router();

    if (!this.interactor) {
      router.post('/documents', async (req, res) =>
        this.uploadDocument(req, new UploadDocumentPresenter(res)),
      );
      return router;
    }

    router.post('/documents', this.upload, async (req, res) =>
      this.uploadDocument(req, new UploadDocumentPresenter(res)),
    );
    router.use(this.uploadErrorHandler);

    return router;
  }
}
