/**
 * Server entry point
 */
import type { CallRepository } from 'src/repository';
import { FirestoreCallRepository } from 'src/repository';
import { InMemoryCallRepository } from 'src/repository';
import { createApp } from 'src/server';

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
