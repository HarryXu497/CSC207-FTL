/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AnalyseMessages,
  BranchRepository,
  CallRepository,
  Ingestor,
  MessageRepositoryBuilder,
} from 'src/repository';
import {
  BranchController,
  CallController,
  DocumentsController,
  SentimentController,
  UploadDocumentInteractor,
} from 'src/service';
import { documentUpload, handleUploadErrors } from './middleware';
import { createHealthRouter, createMessagesRouter } from './routers';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
  ingestor: Ingestor | null = null,
): Router {
  const router = Router();
  const callController = new CallController(callRepo, messageRepoFactory);
  const branchController = new BranchController(callRepo, branchRepo);
  const documentsController = new DocumentsController(
    ingestor ? new UploadDocumentInteractor(ingestor) : null,
    documentUpload.single('file'),
    handleUploadErrors,
  );
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    analyseMessages,
  );

  router.use(createHealthRouter(backend));
  router.use(callController.router());
  router.use(documentsController.router());
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());

  return router;
}
