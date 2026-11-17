import type { UploadDocumentInputBoundary, UploadDocumentInputData } from './input';
import type { UploadDocumentOutputBoundary } from './output';

export class UploadDocumentInteractor implements UploadDocumentInputBoundary {
  async handle(
    { file }: UploadDocumentInputData,
    presenter: UploadDocumentOutputBoundary,
  ): Promise<void> {
    if (!file) {
      presenter.presentBadRequest('A document file is required.');
      return;
    }

    presenter.present({
      document: {
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
      },
    });
  }
}
