import type { Ingestor } from 'src/repository';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadDocumentInputData } from './input';
import { UploadDocumentInteractor } from './interactor';
import type { UploadDocumentOutputBoundary } from './output';

const file = {
  path: '/uploads/document-id.txt',
  filename: 'document-id.txt',
  originalName: 'Refund policy.txt',
  size: 128,
} satisfies NonNullable<UploadDocumentInputData['file']>;

describe('UploadDocumentInteractor', () => {
  let ingestor: Ingestor;
  let presenter: UploadDocumentOutputBoundary;
  let interactor: UploadDocumentInteractor;

  beforeEach(() => {
    ingestor = {
      ingest: vi.fn<Ingestor['ingest']>(),
      ingestFile: vi.fn<Ingestor['ingestFile']>().mockResolvedValue(3),
    };
    presenter = {
      present: vi.fn<UploadDocumentOutputBoundary['present']>(),
      presentBadRequest: vi.fn<UploadDocumentOutputBoundary['presentBadRequest']>(),
    };
    interactor = new UploadDocumentInteractor(ingestor);
  });

  it('ingests the uploaded file and presents metadata without the server path', async () => {
    await interactor.handle({ file }, presenter);

    expect(ingestor.ingestFile).toHaveBeenCalledExactlyOnceWith(file.path);
    expect(ingestor.ingest).not.toHaveBeenCalled();
    expect(presenter.present).toHaveBeenCalledExactlyOnceWith({
      document: {
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        chunksStored: 3,
      },
    });
    expect(presenter.presentBadRequest).not.toHaveBeenCalled();
  });

  it('rejects missing files without calling the ingestor', async () => {
    await interactor.handle({ file: null }, presenter);

    expect(presenter.presentBadRequest).toHaveBeenCalledExactlyOnceWith(
      'A document file is required.',
    );
    expect(ingestor.ingestFile).not.toHaveBeenCalled();
    expect(presenter.present).not.toHaveBeenCalled();
  });

  it('rejects documents with no ingestible text', async () => {
    vi.mocked(ingestor.ingestFile).mockResolvedValueOnce(0);

    await interactor.handle({ file }, presenter);

    expect(presenter.presentBadRequest).toHaveBeenCalledExactlyOnceWith(
      'The document contains no text to ingest.',
    );
    expect(presenter.present).not.toHaveBeenCalled();
  });

  it('propagates ingestion failures without presenting success', async () => {
    const error = new Error('Chroma is unavailable');
    vi.mocked(ingestor.ingestFile).mockRejectedValueOnce(error);

    await expect(interactor.handle({ file }, presenter)).rejects.toBe(error);

    expect(presenter.present).not.toHaveBeenCalled();
    expect(presenter.presentBadRequest).not.toHaveBeenCalled();
  });
});
