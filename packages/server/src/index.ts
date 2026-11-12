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

function main(): void {
  const callRepo = buildCallRepository();
  const branchRepo = buildBranchRepository(callRepo);
  const messageRepoFactory = buildMessageRepoFactory();
  const app = createApp(callRepo, branchRepo, messageRepoFactory, BACKEND);

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log('');
  });
}

main();
