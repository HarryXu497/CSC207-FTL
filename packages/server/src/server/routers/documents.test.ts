import type { UploadDocumentResponse } from '@recall/shared';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { InMemoryBranchRepository } from '../../repository/database/branches/InMemoryBranchRepository';
import { InMemoryCallRepository } from '../../repository/database/calls/InMemoryCallRepository';
import { InMemoryMessageRepository } from '../../repository/database/messages/InMemoryMessageRepository';
import { createApp } from '../app';
import {
  DOCUMENT_UPLOAD_DIRECTORY,
  MAX_DOCUMENT_UPLOAD_BYTES,
  documentStorage,
} from '../middleware';

let server: Server;
let url: string;
const savedFiles = new Set<string>();

beforeAll(async () => {
  const calls = new InMemoryCallRepository([]);
  const branches = new InMemoryBranchRepository(calls, []);
  const app = createApp(calls, branches, () => new InMemoryMessageRepository([]), 'memory');
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

async function uploadDocument(filename: string, contents = 'Reference document') {
  const response = await fetch(url, { method: 'POST', body: documentForm(filename, contents) });
  expect(response.status).toBe(201);

  const result = (await response.json()) as UploadDocumentResponse;
  expect(result.document.filename).toMatch(/^[0-9a-f-]{36}\.(txt|md|pdf)$/);
  const path = join(DOCUMENT_UPLOAD_DIRECTORY, result.document.filename);
  savedFiles.add(path);

  expect(result).toEqual({
    document: {
      filename: expect.any(String),
      originalName: filename,
      size: Buffer.byteLength(contents),
    },
  });
  expect(
    result.document.filename.endsWith(filename.slice(filename.lastIndexOf('.')).toLowerCase()),
  ).toBe(true);
  expect(await readFile(path, 'utf8')).toBe(contents);
  return result.document;
}

async function uploadedFilenames() {
  try {
    return (await readdir(DOCUMENT_UPLOAD_DIRECTORY)).sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function expectUploadError(
  status: number,
  body?: FormData | string,
  headers?: Record<string, string>,
) {
  const before = await uploadedFilenames();
  const response = await fetch(url, { method: 'POST', body, headers });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { message: expect.any(String) } });
  expect(await uploadedFilenames()).toEqual(before);
}

describe('POST /api/documents', () => {
  it.each(['notes.txt', 'policy.md', 'handbook.pdf', 'HANDBOOK.PDF'])(
    'saves %s and returns its metadata',
    async (filename) => {
      await uploadDocument(filename);
    },
  );

  it('accepts a document at the 10 MiB limit', async () => {
    await uploadDocument('limit.txt', 'x'.repeat(MAX_DOCUMENT_UPLOAD_BYTES));
  });

  it('keeps uploads with the same original name as separate files', async () => {
    const first = await uploadDocument('notes.txt', 'First upload');
    const second = await uploadDocument('notes.txt', 'Second upload');
    expect(first.filename).not.toBe(second.filename);
  });

  it('returns 400 when the request has no file', async () => {
    await expectUploadError(400);
  });

  it('returns 400 when the multipart form only contains text', async () => {
    const form = new FormData();
    form.append('description', 'No document attached');
    await expectUploadError(400, form);
  });

  it.each(['program.exe', 'handbook.pdf.exe'])('returns 415 for %s', async (filename) => {
    await expectUploadError(415, documentForm(filename));
  });

  it('returns 413 and removes the partial file when the size limit is exceeded', async () => {
    await expectUploadError(
      413,
      documentForm('large.txt', 'x'.repeat(MAX_DOCUMENT_UPLOAD_BYTES + 1)),
    );
  });

  it('returns 400 and removes saved files when more than one file is sent', async () => {
    const form = documentForm('first.txt');
    form.append('file', new Blob(['Second document']), 'second.txt');
    await expectUploadError(400, form);
  });

  it('returns 400 for an unexpected file field', async () => {
    const form = new FormData();
    form.append('attachment', new Blob(['Document']), 'notes.txt');
    await expectUploadError(400, form);
  });

  it.each([
    ['missing boundary', 'multipart/form-data', 'invalid multipart body'],
    [
      'malformed header',
      'multipart/form-data; boundary=upload-test',
      '--upload-test\r\ninvalid header\r\n\r\ncontent\r\n--upload-test--\r\n',
    ],
    [
      'truncated file',
      'multipart/form-data; boundary=upload-test',
      '--upload-test\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\nincomplete',
    ],
  ])('returns 400 without leaving files for a %s', async (_name, contentType, body) => {
    await expectUploadError(400, body, { 'Content-Type': contentType });
  });

  it('keeps unexpected storage failures as server errors', async () => {
    const storage = vi
      .spyOn(documentStorage, '_handleFile')
      .mockImplementationOnce((_req, _file, callback) => callback(new Error('Disk unavailable')));
    const logging = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expectUploadError(500, documentForm('notes.txt'));
    } finally {
      storage.mockRestore();
      logging.mockRestore();
    }
  });
});
