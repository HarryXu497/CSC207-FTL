/**
 * Integration tests for POST /api/accuracy/analyze, through the real Express app.
 */
import type { AnalyzeAccuracyResponse } from '@recall/shared';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { InMemoryCallRepository } from 'src/repository';
import { createApp } from 'src/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AnalyzeAccuracy } from './AnalyzeAccuracy';
import { FakeLlm, FakeRetriever, json, type Script } from './testing';

const script: Script = {
  extract: () => json({ claims: [{ messageIndex: 1, text: 'Returns take 30 days.' }] }),
  judge: () =>
    json({
      verdict: 'supported',
      confidence: 1,
      evidenceChunk: 1,
      quote: 'returned within 30 days of delivery',
      explanation: 'Matches.',
    }),
  classify: () =>
    json({
      documents: [{ source: 'docs/returns-policy.md', role: 'required', reason: 'Returns.' }],
    }),
};

function start(service?: AnalyzeAccuracy) {
  const app = createApp(new InMemoryCallRepository(), 'memory', { accuracy: service });
  const server = app.listen(0);
  return new Promise<{ server: Server; url: string }>((resolve) =>
    server.once('listening', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}/api/accuracy/analyze` });
    }),
  );
}

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const valid = {
  messages: [
    { speaker: 'customer', text: 'Can I return this?' },
    { speaker: 'agent', text: 'Returns take 30 days.' },
  ],
};

let configured: { server: Server; url: string };
let unconfigured: { server: Server; url: string };
let broken: { server: Server; url: string };

beforeAll(async () => {
  configured = await start(new AnalyzeAccuracy(new FakeLlm(script), new FakeRetriever()));
  unconfigured = await start(undefined);
  broken = await start(
    new AnalyzeAccuracy(new FakeLlm({ ...script, extract: () => 'nope' }), new FakeRetriever()),
  );
});

afterAll(async () => {
  for (const { server } of [configured, unconfigured, broken]) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('POST /api/accuracy/analyze', () => {
  it('returns the accuracy result', async () => {
    const response = await post(configured.url, valid);
    const body = (await response.json()) as AnalyzeAccuracyResponse;

    expect(response.status).toBe(200);
    expect(body.accuracy.score).toBe(100);
    expect(body.accuracy.claims[0]?.verdict).toBe('supported');
    expect(body.accuracy.documents.required[0]?.source).toBe('docs/returns-policy.md');
  });

  it('rejects an empty transcript with a 400', async () => {
    const response = await post(configured.url, { messages: [] });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('messages');
  });

  it('rejects an unknown speaker with a 400', async () => {
    const response = await post(configured.url, {
      messages: [{ speaker: 'robot', text: 'hello' }],
    });
    expect(response.status).toBe(400);
  });

  it('rejects a transcript over the length limit with a 400 explaining why', async () => {
    const long = { speaker: 'agent', text: 'x'.repeat(4000) };
    const response = await post(configured.url, { messages: Array(8).fill(long) });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('too long');
  });

  it('answers 413, not 500, when the body is over the size limit', async () => {
    const response = await post(configured.url, { messages: [], padding: 'x'.repeat(200_000) });
    expect(response.status).toBe(413);
  });

  it('answers 400, not 500, for malformed JSON', async () => {
    const response = await fetch(configured.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    expect(response.status).toBe(400);
  });

  it('answers 503 when accuracy analysis is not configured', async () => {
    const response = await post(unconfigured.url, valid);
    expect(response.status).toBe(503);
  });

  it('answers 502 when the model keeps returning unusable output', async () => {
    const response = await post(broken.url, valid);
    expect(response.status).toBe(502);
  });
});
