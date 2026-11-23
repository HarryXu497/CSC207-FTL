import { Router, type Request } from 'express';
import { documentUpload, handleUploadErrors } from 'src/server/middleware';
import {
  UploadDocumentPresenter,
  type UploadDocumentInputBoundary,
  type UploadDocumentOutputBoundary,
} from './UploadDocument';

export class DocumentsController {
  constructor(private readonly interactor: UploadDocumentInputBoundary | null) {}

  async uploadDocument(req: Request, presenter: UploadDocumentOutputBoundary): Promise<void> {
    if (!this.interactor) {
      presenter.presentServiceUnavailable();
      return;
    }

    const file = req.file;

    await this.interactor.handle(
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

    router.post('/documents', documentUpload.single('file'), async (req, res) =>
      this.uploadDocument(req, new UploadDocumentPresenter(res)),
    );
    router.use(handleUploadErrors);

    return router;
  }
}
