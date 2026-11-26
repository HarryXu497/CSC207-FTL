/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AnalyseMessages,
  BranchRepository,
  CallRepository,
  MessageRepositoryBuilder,
  SimulationRepository,
} from 'src/repository';
import { CallController } from 'src/service';
import { BranchController } from 'src/service';
import { SentimentController } from 'src/service';
import { SimulateMessageInteractor, SimulationController } from 'src/service';
import { createHealthRouter, createMessagesRouter } from './routers';

/** Optional services. A missing service makes its routes respond with 503. */
export interface ServerServices {
  analyseMessages?: AnalyseMessages | null;
  simulationRepo?: SimulationRepository | null;
}

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();
  const callController = new CallController(callRepo, messageRepoFactory);
  const branchController = new BranchController(callRepo, branchRepo);
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
  );
  const simulationRepo = services.simulationRepo ?? null;
  const simulationController = new SimulationController(
    simulationRepo ? new SimulateMessageInteractor(callRepo, branchRepo, simulationRepo) : null,
  );

  router.use(createHealthRouter(backend));
  router.use(callController.router());
  router.use(createMessagesRouter(callRepo, branchRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());
  router.use(simulationController.router());

  return router;
}
