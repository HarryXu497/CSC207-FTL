/**
 * Server entry point
 */
import { resolve } from 'node:path';
import { ChatOpenAI } from '@langchain/openai';
import { ChromaClient } from 'chromadb';
import type { AccuracyRepository, CallRepository } from 'src/repository';
import {
  ChatModelLlmClient,
  ChromaRetriever,
  createMessageRepositoryBuilder,
  FirestoreAccuracyRepository,
  FirestoreCallRepository,
  InMemoryAccuracyRepository,
  InMemoryCallRepository,
  LlmAccuracyAnalyzer,
  type AccuracyAnalyzer,
  type MessageRepositoryBuilder,
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

function buildAccuracyRepository(): AccuracyRepository {
  return BACKEND === 'firestore'
    ? new FirestoreAccuracyRepository()
    : new InMemoryAccuracyRepository();
}

function buildBranchRepository(
  callRepo: CallRepository,
  messageRepoBuilder: MessageRepositoryBuilder,
): BranchRepository {
  return BACKEND === 'firestore'
    ? new FirestoreBranchRepository()
    : new InMemoryBranchRepository(callRepo, messageRepoBuilder);
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

function buildAccuracyAnalyzer(): AccuracyAnalyzer | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = new ChatOpenAI({
    model: process.env.ACCURACY_MODEL ?? 'gpt-4o-mini',
    temperature: 0,
    apiKey,
  });

  const chroma = new ChromaClient({
    host: process.env.CHROMA_HOST ?? 'localhost',
    port: Number(process.env.CHROMA_PORT ?? '8000'),
  });

  return new LlmAccuracyAnalyzer(
    new ChatModelLlmClient(model),
    new ChromaRetriever(chroma, process.env.CHROMA_COLLECTION ?? 'documents'),
  );
}

async function main(): Promise<void> {
  const callRepo = buildCallRepository();
  const messageRepoFactory = createMessageRepositoryBuilder(BACKEND);
  const branchRepo = buildBranchRepository(callRepo, messageRepoFactory);
  const analyseMessages = await buildSentimentDeps();
  const accuracyAnalyzer = buildAccuracyAnalyzer();
  const accuracyRepo = buildAccuracyRepository();
  const app = createApp(callRepo, branchRepo, messageRepoFactory, BACKEND, {
    analyseMessages,
    accuracyAnalyzer,
    accuracyRepo,
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log(`  accuracy: ${accuracyAnalyzer ? 'enabled' : 'disabled (no OPENAI_API_KEY)'}`);
    console.log('');
  });
}

main().catch(console.log);
