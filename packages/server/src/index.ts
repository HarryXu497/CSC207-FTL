/**
 * Server entry point
 */
import { ChatOpenAI } from '@langchain/openai';
import type { AccuracyRepository, CallRepository, SentimentRepository } from 'src/repository';
import {
  ChatModelLlmClient,
  createMessageRepositoryBuilder,
  FirestoreAccuracyRepository,
  FirestoreCallRepository,
  FirestoreSentimentRepository,
  InMemoryAccuracyRepository,
  InMemoryCallRepository,
  InMemorySentimentRepository,
  LlmAccuracyAnalyzer,
  type AccuracyAnalyzer,
  type MessageRepositoryBuilder,
} from 'src/repository';
import { createApp } from 'src/server';
import { buildRagIngestor, buildRagRetriever } from './config/rag';
import { resolveSentimentModelPath } from './config/sentiment';
import { buildSimulationRepository } from './config/simulation';
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

function buildSentimentRepository(): SentimentRepository {
  return BACKEND === 'firestore'
    ? new FirestoreSentimentRepository()
    : new InMemorySentimentRepository();
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
  const modelPath = resolveSentimentModelPath();
  if (!modelPath) return null;

  const classifier = await GoEmotionsClassifier.create(modelPath);
  const vadEstimator = await VadBertEstimator.create(modelPath);
  return new AnalyseMessages(classifier, vadEstimator);
}

function buildAccuracyAnalyzer(): AccuracyAnalyzer | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = new ChatOpenAI({
    model: process.env.ACCURACY_MODEL ?? 'gpt-4o-mini',
    temperature: 0,
    apiKey,
    timeout: 30_000,
    maxRetries: 1,
  });

  return new LlmAccuracyAnalyzer(new ChatModelLlmClient(model), buildRagRetriever(apiKey));
}

async function main(): Promise<void> {
  const callRepo = buildCallRepository();
  const messageRepoFactory = createMessageRepositoryBuilder(BACKEND);
  const branchRepo = buildBranchRepository(callRepo, messageRepoFactory);
  const analyseMessages = await buildSentimentDeps();
  const accuracyAnalyzer = buildAccuracyAnalyzer();
  const accuracyRepo = buildAccuracyRepository();
  const simulationRepo = buildSimulationRepository(callRepo, messageRepoFactory);
  const ingestor = buildRagIngestor();
  const sentimentRepo = buildSentimentRepository();
  const app = createApp(callRepo, branchRepo, messageRepoFactory, BACKEND, {
    analyseMessages,
    accuracyAnalyzer,
    accuracyRepo,
    simulationRepo,
    ingestor,
    sentimentRepo,
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log(`  simulation: ${simulationRepo ? 'enabled' : 'disabled'}`);
    console.log(
      `  sentiment: ${analyseMessages ? 'enabled' : 'disabled (run npm run models:download and restart)'}`,
    );
    console.log(`  accuracy: ${accuracyAnalyzer ? 'enabled' : 'disabled (no OPENAI_API_KEY)'}`);
    console.log('');
  });
}

main().catch(console.log);
