import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AnalyzeAccuracyInteractor } from './AnalyzeAccuracy';
import { AccuracyController } from './controller';
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

function start(controller: AccuracyController) {
  const app = express();
  app.use(express.json());
  app.use('/api', controller.router());
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
    { role: 'customer', content: 'Can I return this?' },
    { role: 'agent', content: 'Returns take 30 days.' },
  ],
};

let configured: { server: Server; url: string };
let unconfigured: { server: Server; url: string };
let broken: { server: Server; url: string };

beforeAll(async () => {
  const interactor = (s: Script) =>
    new AccuracyController(new AnalyzeAccuracyInteractor(new FakeLlm(s), new FakeRetriever()));
  configured = await start(interactor(script));
  unconfigured = await start(new AccuracyController(null));
  broken = await start(interactor({ ...script, extract: () => 'nope' }));
});

afterAll(async () => {
  for (const { server } of [configured, unconfigured, broken]) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('POST /api/accuracy/analyze', () => {
  it('returns the accuracy result', async () => {
    const response = await post(configured.url, valid);
    const body = (await response.json()) as {
      accuracy: {
        score: number;
        claims: { verdict: string }[];
        documents: { required: { source: string }[] };
      };
    };

    expect(response.status).toBe(200);
    expect(body.accuracy.score).toBe(100);
    expect(body.accuracy.claims[0]?.verdict).toBe('supported');
    expect(body.accuracy.documents.required[0]?.source).toBe('docs/returns-policy.md');
  });

  it('rejects an empty transcript with a 400 naming the field', async () => {
    const response = await post(configured.url, { messages: [] });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('messages');
  });

  it('rejects an unknown role with a 400', async () => {
    const response = await post(configured.url, {
      messages: [{ role: 'robot', content: 'hello' }],
    });
    expect(response.status).toBe(400);
  });

  it('rejects a transcript over the length limit with a 400 explaining why', async () => {
    const long = { role: 'agent', content: 'x'.repeat(4000) };
    const response = await post(configured.url, { messages: Array(8).fill(long) });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('too long');
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
