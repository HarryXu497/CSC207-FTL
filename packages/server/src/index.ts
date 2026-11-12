/**
 * Server entry point
 */
import type { CallRepository } from 'src/repository';
import { FirestoreCallRepository, InMemoryCallRepository } from 'src/repository';
import { createApp } from 'src/server';
import {
  FirestoreBranchRepository,
  InMemoryBranchRepository,
  type BranchRepository,
} from './repository/database/branches';
import {
  FirestoreMessageRepository,
  InMemoryMessageRepository,
  type MessageRepository,
} from './repository/database/messages';
import { resolve } from 'node:path';
import { GoEmotionsClassifier, VadBertEstimator } from './repository/sentiment/TransformersModels';
import { AnalyseMessages } from './repository/sentiment/AnalyseMessages';
import type { SentimentDeps } from './server/routers';

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

function buildMessageRepoFactory(): (
  parentCollection: 'calls' | 'branches',
  parentId: string,
) => MessageRepository {
  if (BACKEND === 'firestore') {
    return (parentCollection, parentId) =>
      new FirestoreMessageRepository(parentCollection, parentId);
  }

  return () => new InMemoryMessageRepository();
}

async function buildSentimentDeps(repository: CallRepository): Promise<SentimentDeps | undefined> {
  const modelDir = process.env.MODEL_DIR;
  if (!modelDir) return undefined;

  const modelPath = resolve(modelDir);
  const classifier = await GoEmotionsClassifier.create(modelPath);
  const vadEstimator = await VadBertEstimator.create(modelPath);
  const analyseMessages = new AnalyseMessages(classifier, vadEstimator);

  if (BACKEND === 'firestore') {
    return {
      analyseMessages,
      messageRepoFactory: (callId) =>
        new FirestoreMessageRepository(FirestoreCallRepository.COLLECTION, callId),
    };
  }

  const demoCalls = await repository.getAllCalls();
  const demoMessages = new Map(demoCalls.map(({ id }) => [id, new InMemoryMessageRepository()]));

  return {
    analyseMessages,
    messageRepoFactory: (callId) => demoMessages.get(callId) ?? new InMemoryMessageRepository([]),
  };
}
  
async function main(): Promise<void> {
  const callRepo = buildCallRepository();
  const branchRepo = buildBranchRepository(callRepo);
  const messageRepoFactory = buildMessageRepoFactory();
  const sentiment = await buildSentimentDeps(callRepo);
  const app = createApp(callRepo, branchRepo, messageRepoFactory, BACKEND, sentiment);

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log('');
  });
}


main().catch(console.log)
