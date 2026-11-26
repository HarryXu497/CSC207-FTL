import { resolve } from 'node:path';
import { createRagIngestor } from '../config/rag';

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run rag:ingest -- /path/to/policies');

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('Set OPENAI_API_KEY in packages/server/.env before indexing.');

  const ingestor = createRagIngestor(apiKey);

  const chunks = await ingestor.ingest(resolve(process.env.INIT_CWD || process.cwd(), path));
  if (chunks === 0) throw new Error('No policy text found. Add a .txt, .md, or .pdf file.');
  console.log(`Indexed ${chunks} policy chunks.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Could not index policy documents.');
  process.exitCode = 1;
});
