/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AnalyseMessages,
  BranchRepository,
  CallRepository,
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
): Router {
  const router = Router();
  const callController = new CallController(callRepo, messageRepoFactory);
  const branchController = new BranchController(callRepo, branchRepo);
  const documentsController = new DocumentsController(
    new UploadDocumentInteractor(),
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
