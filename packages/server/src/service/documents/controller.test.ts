import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { UploadDocumentInputBoundary, UploadDocumentOutputBoundary } from './UploadDocument';
import { DocumentsController } from './controller';

describe('DocumentsController', () => {
  it('rejects missing files without calling the interactor', async () => {
    const interactor: UploadDocumentInputBoundary = {
      handle: vi.fn<UploadDocumentInputBoundary['handle']>(),
    };
    const presenter: UploadDocumentOutputBoundary = {
      present: vi.fn<UploadDocumentOutputBoundary['present']>(),
      presentBadRequest: vi.fn<UploadDocumentOutputBoundary['presentBadRequest']>(),
      presentServiceUnavailable: vi.fn<UploadDocumentOutputBoundary['presentServiceUnavailable']>(),
    };
    const controller = new DocumentsController(
      interactor,
      vi.fn<RequestHandler>(),
      vi.fn<ErrorRequestHandler>(),
    );

    await controller.uploadDocument({} as Request, presenter);

    expect(presenter.presentBadRequest).toHaveBeenCalledExactlyOnceWith(
      'A document file is required.',
    );
    expect(interactor.handle).not.toHaveBeenCalled();
    expect(presenter.present).not.toHaveBeenCalled();
  });
});
