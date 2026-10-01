/**
 * The entry point, and the COMPOSITION ROOT.
 *
 * This is the ONLY file that decides which concrete classes to use. Everything
 * else holds an interface. Read the eight lines of main() and you have the whole
 * dependency graph of the server.
 */
import { createApp } from './app';
import type { CallRepository } from './CallRepository';
import { FirestoreCallRepository } from './FirestoreCallRepository';
import { InMemoryCallRepository } from './InMemoryCallRepository';

/* All environment reading happens here, once, so you can always tell what
   configuration the app is running under. */
const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const BACKEND = process.env.DATA_BACKEND === 'firestore' ? 'firestore' : 'memory';

/**
 * The ONLY function in the project that knows both implementations exist.
 * Swap backends with one environment variable - no code changes anywhere else.
 */
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
