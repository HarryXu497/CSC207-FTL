/**
 * Server entry point
 */
import { resolve } from 'node:path';
import type { CallRepository } from 'src/repository';
import {
  createMessageRepositoryBuilder,
  FirestoreCallRepository,
  InMemoryCallRepository,
} from 'src/repository';
import { createApp } from 'src/server';
import {
  FirestoreBranchRepository,
  InMemoryBranchRepository,
  type BranchRepository,
} from './repository/database/branches';
import { AnalyseMessages } from './repository/sentiment/AnalyseMessages';
import { GoEmotionsClassifier, VadBertEstimator } from './repository/sentiment/TransformersModels';

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const BACKEND = process.env.DATA_BACKEND === 'firestore' ? 'firestore' : 'memory';

function buildCallRepository(): CallRepository {
  return BACKEND === 'firestore' ? new FirestoreCallRepository() : new InMemoryCallRepository();
}

function buildBranchRepository(callRepo: CallRepository): BranchRepository {
  return BACKEND === 'firestore'
    ? new FirestoreBranchRepository()
    : new InMemoryBranchRepository(callRepo);
}

async function buildSentimentDeps(): Promise<AnalyseMessages | null> {
  const modelDir = process.env.MODEL_DIR;

  if (!modelDir) {
    return null;
  }

  const modelPath = resolve(modelDir);
  const classifier = await GoEmotionsClassifier.create(modelPath);
  const vadEstimator = await VadBertEstimator.create(modelPath);
  return new AnalyseMessages(classifier, vadEstimator);
}

async function main(): Promise<void> {
  const callRepo = buildCallRepository();
  const branchRepo = buildBranchRepository(callRepo);
  const messageRepoFactory = createMessageRepositoryBuilder(BACKEND);
  const sentiment = await buildSentimentDeps();
  const app = createApp(callRepo, branchRepo, messageRepoFactory, BACKEND, sentiment);

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log('');
  });
}

main().catch(console.log);
