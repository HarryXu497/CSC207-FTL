import type { UploadDocumentOutputData } from 'src/service/documents/UploadDocument';
import type { Ingestor } from 'src/repository';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryBranchRepository } from '../../repository/database/branches/InMemoryBranchRepository';
import { InMemoryCallRepository } from '../../repository/database/calls/InMemoryCallRepository';
import { createMessageRepositoryBuilder } from '../../repository/database/messages/MessageRepositoryFactory';
import { createApp } from '../app';
import { DOCUMENT_UPLOAD_DIRECTORY, MAX_DOCUMENT_UPLOAD_BYTES } from '../middleware';

let url: string;
let disabledUrl: string;
const servers: Server[] = [];
const savedFiles = new Set<string>();
const ingestFile = vi.fn<Ingestor['ingestFile']>();
const ingestor: Ingestor = { ingest: vi.fn<Ingestor['ingest']>(), ingestFile };

async function startServer(documentIngestor: Ingestor | null): Promise<string> {
  const calls = new InMemoryCallRepository([]);
  const messageRepoFactory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, messageRepoFactory, []);
  const app = createApp(calls, branches, messageRepoFactory, 'memory', {
    ingestor: documentIngestor,
  });
  const server = createServer(app);
  servers.push(server);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
  return `http://127.0.0.1:${address.port}/api/documents`;
}

beforeAll(async () => {
  url = await startServer(ingestor);
  disabledUrl = await startServer(null);
});

beforeEach(() => {
  ingestFile.mockReset().mockResolvedValue(3);
});

afterEach(async () => {
  for (const [path] of ingestFile.mock.calls) savedFiles.add(path);
  await Promise.all([...savedFiles].map((path) => unlink(path)));
  savedFiles.clear();
});

afterAll(async () => {
  await Promise.all(
    servers.map(async (server) => {
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }),
  );
});

function documentForm(filename: string, contents = 'Reference document') {
  const form = new FormData();
  form.append('file', new Blob([contents]), filename);
  return form;
}

async function uploadedFilenames() {
  try {
    return (await readdir(DOCUMENT_UPLOAD_DIRECTORY)).sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function expectUploadError(status: number, body?: FormData) {
  const before = await uploadedFilenames();
  const response = await fetch(url, { method: 'POST', body });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { message: expect.any(String) } });
  expect(await uploadedFilenames()).toEqual(before);
  expect(ingestFile).not.toHaveBeenCalled();
}

describe('POST /api/documents', () => {
  it('ingests the uploaded document and returns its metadata and chunk count', async () => {
    const filename = 'NOTES.TXT';
    const contents = 'Reference document';
    const response = await fetch(url, { method: 'POST', body: documentForm(filename, contents) });
    expect(response.status).toBe(201);

    const result = (await response.json()) as UploadDocumentOutputData;
    expect(result.document.filename).toMatch(/^[0-9a-f-]{36}\.txt$/);
    const path = join(DOCUMENT_UPLOAD_DIRECTORY, result.document.filename);
    savedFiles.add(path);

    expect(result).toEqual({
      document: {
        filename: expect.any(String),
        originalName: filename,
        size: Buffer.byteLength(contents),
        chunksStored: 3,
      },
    });
    expect(await readFile(path, 'utf8')).toBe(contents);
    expect(ingestFile).toHaveBeenCalledExactlyOnceWith(path);
  });

  it('returns 400 when the request has no file', async () => {
    await expectUploadError(400);
  });

  it('returns 415 for an unsupported file extension', async () => {
    await expectUploadError(415, documentForm('handbook.pdf.exe'));
  });

  it('returns 413 and removes the partial file when the size limit is exceeded', async () => {
    await expectUploadError(
      413,
      documentForm('large.txt', 'x'.repeat(MAX_DOCUMENT_UPLOAD_BYTES + 1)),
    );
  });

  it('returns 400 when ingestion finds no text', async () => {
    ingestFile.mockResolvedValueOnce(0);

    const response = await fetch(url, { method: 'POST', body: documentForm('empty.txt', '') });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { message: 'The document contains no text to ingest.' },
    });
  });

  it('returns a generic 500 when ingestion fails', async () => {
    ingestFile.mockRejectedValueOnce(new Error('Private upstream details'));

    const response = await fetch(url, { method: 'POST', body: documentForm('policy.txt') });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { message: 'Something went wrong on the server.' },
    });
  });

  it('returns 503 without saving files when ingestion is disabled', async () => {
    const before = await uploadedFilenames();

    const response = await fetch(disabledUrl, {
      method: 'POST',
      body: documentForm('policy.txt'),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { message: 'Document ingestion is not available.' },
    });
    expect(await uploadedFilenames()).toEqual(before);
    expect(ingestFile).not.toHaveBeenCalled();
  });
});
