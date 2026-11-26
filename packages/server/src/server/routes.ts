/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AccuracyAnalyzer,
  AccuracyRepository,
  BranchRepository,
  CallRepository,
  Ingestor,
  MessageRepositoryBuilder,
  SentimentAnalyzer,
  SentimentRepository,
  SimulationRepository,
} from 'src/repository';
import {
  AccuracyController,
  BranchController,
  CallController,
  DocumentsController,
  SentimentController,
  SimulateMessageInteractor,
  SimulationController,
  UploadDocumentInteractor,
} from 'src/service';
import { documentUpload, handleUploadErrors } from './middleware';
import { createHealthRouter, createMessagesRouter } from './routers';

/** Optional services. A missing service makes its routes respond with 503. */
export interface ServerServices {
  analyseMessages?: SentimentAnalyzer | null;
  accuracyAnalyzer?: AccuracyAnalyzer | null;
  accuracyRepo?: AccuracyRepository | null;
  sentimentRepo?: SentimentRepository | null;
  simulationRepo?: SimulationRepository | null;
  ingestor?: Ingestor | null;
}

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();
  const accuracyRepo = services.accuracyRepo ?? null;
  const sentimentRepo = services.sentimentRepo ?? null;
  const callController = new CallController(
    callRepo,
    messageRepoFactory,
    accuracyRepo,
    sentimentRepo,
  );
  const branchController = new BranchController(callRepo, branchRepo, accuracyRepo, sentimentRepo);
  const ingestor = services.ingestor ?? null;
  const documentsController = new DocumentsController(
    ingestor ? new UploadDocumentInteractor(ingestor) : null,
    documentUpload.single('file'),
    handleUploadErrors,
  );
  const sentimentController = new SentimentController(
    callRepo,
    branchRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
    sentimentRepo,
  );
  const simulationRepo = services.simulationRepo ?? null;
  const simulationController = new SimulationController(
    simulationRepo ? new SimulateMessageInteractor(callRepo, branchRepo, simulationRepo) : null,
  );
  const accuracyController = new AccuracyController(
    services.accuracyAnalyzer ?? null,
    accuracyRepo,
    callRepo,
    branchRepo,
    messageRepoFactory,
  );

  router.use(createHealthRouter(backend));
  router.use(callController.router());
  router.use(documentsController.router());
  router.use(createMessagesRouter(callRepo, branchRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());
  router.use(simulationController.router());
  router.use(accuracyController.router());

  return router;
}
