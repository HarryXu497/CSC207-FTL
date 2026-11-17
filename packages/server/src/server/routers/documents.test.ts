import type { UploadDocumentResponse } from 'src/entities';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryBranchRepository } from '../../repository/database/branches/InMemoryBranchRepository';
import { InMemoryCallRepository } from '../../repository/database/calls/InMemoryCallRepository';
import { createMessageRepositoryBuilder } from '../../repository/database/messages/MessageRepositoryFactory';
import { createApp } from '../app';
import { DOCUMENT_UPLOAD_DIRECTORY, MAX_DOCUMENT_UPLOAD_BYTES } from '../middleware';

let server: Server;
let url: string;
const savedFiles = new Set<string>();

beforeAll(async () => {
  const calls = new InMemoryCallRepository([]);
  const messageRepoFactory = createMessageRepositoryBuilder('memory');
  const branches = new InMemoryBranchRepository(calls, messageRepoFactory, []);
  const app = createApp(calls, branches, messageRepoFactory, 'memory', null);
  server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
  url = `http://127.0.0.1:${address.port}/api/documents`;
});

afterEach(async () => {
  await Promise.all([...savedFiles].map((path) => unlink(path)));
  savedFiles.clear();
});

afterAll(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
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
}

describe('POST /api/documents', () => {
  it('saves a document and returns its metadata', async () => {
    const filename = 'NOTES.TXT';
    const contents = 'Reference document';
    const response = await fetch(url, { method: 'POST', body: documentForm(filename, contents) });
    expect(response.status).toBe(201);

    const result = (await response.json()) as UploadDocumentResponse;
    expect(result.document.filename).toMatch(/^[0-9a-f-]{36}\.txt$/);
    const path = join(DOCUMENT_UPLOAD_DIRECTORY, result.document.filename);
    savedFiles.add(path);

    expect(result).toEqual({
      document: {
        filename: expect.any(String),
        originalName: filename,
        size: Buffer.byteLength(contents),
      },
    });
    expect(await readFile(path, 'utf8')).toBe(contents);
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
});
