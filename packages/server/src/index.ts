/**
 * Server entry point
 */
import { createApp } from './app';
import type { CallRepository } from './CallRepository';
import { FirestoreCallRepository } from './FirestoreCallRepository';
import { InMemoryCallRepository } from './InMemoryCallRepository';

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const BACKEND = process.env.DATA_BACKEND === 'firestore' ? 'firestore' : 'memory';

function buildRepository(): CallRepository {
  return BACKEND === 'firestore' ? new FirestoreCallRepository() : new InMemoryCallRepository();
}

function main(): void {
  const repository = buildRepository();
  const app = createApp(repository, BACKEND);

  app.listen(PORT, () => {
    console.log('');
    console.log('  ReCall API running');
    console.log(`  -> http://localhost:${PORT}/api/health`);
    console.log(`  storage: ${BACKEND}${BACKEND === 'memory' ? ' (resets on restart)' : ''}`);
    console.log('');
  });
}

main();
