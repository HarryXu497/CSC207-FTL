import { Router, type Request } from 'express';
import { documentUpload, handleUploadErrors } from 'src/server/middleware';
import {
  UploadDocumentPresenter,
  type UploadDocumentInputBoundary,
  type UploadDocumentOutputBoundary,
} from './UploadDocument';

export class DocumentsController {
  constructor(private readonly interactor: UploadDocumentInputBoundary) {}

  async uploadDocument(req: Request, presenter: UploadDocumentOutputBoundary): Promise<void> {
    const file = req.file;

    if (!file) {
      presenter.presentBadRequest('A document file is required.');
      return;
    }

    await this.interactor.handle(
      {
        file: { filename: file.filename, originalName: file.originalname, size: file.size },
      },
      presenter,
    );
  }

  router(): Router {
    const router = Router();

    router.post('/documents', documentUpload.single('file'), async (req, res) =>
      this.uploadDocument(req, new UploadDocumentPresenter(res)),
    );
    router.use(handleUploadErrors);

    return router;
  }
}
