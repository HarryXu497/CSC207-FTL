import type { Ingestor } from 'src/repository';
import type { UploadDocumentInputBoundary, UploadDocumentInputData } from './input';
import type { UploadDocumentOutputBoundary } from './output';

export class UploadDocumentInteractor implements UploadDocumentInputBoundary {
  constructor(private readonly ingestor: Ingestor) {}

  async handle(
    { file }: UploadDocumentInputData,
    presenter: UploadDocumentOutputBoundary,
  ): Promise<void> {
    if (!file) {
      presenter.presentBadRequest('A document file is required.');
      return;
    }

    const chunksStored = await this.ingestor.ingestFile(file.path);

    if (chunksStored === 0) {
      presenter.presentBadRequest('The document contains no text to ingest.');
      return;
    }

    presenter.present({
      document: {
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        chunksStored,
      },
    });
  }
}
