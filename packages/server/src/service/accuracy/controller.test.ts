import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  InMemoryAccuracyRepository,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  InMemoryMessageRepository,
  LlmAccuracyAnalyzer,
  type AccuracyAnalyzer,
  type AccuracyRepository,
} from 'src/repository';
import { FakeLlm, FakeRetriever, json, type Script } from 'src/repository/accuracy/testing';
import { createApp } from 'src/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AnalyzeAccuracyOutputData } from './AnalyzeAccuracy';

// No real model or knowledge base: FakeRetriever plays the RAG search and returns a returns-policy
// document, and the scripted LLM finds one claim that the policy supports.
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

async function start(
  accuracyAnalyzer: AccuracyAnalyzer | null,
  accuracyRepo: AccuracyRepository | null = new InMemoryAccuracyRepository(),
) {
  const callRepo = new InMemoryCallRepository();
  const messages = () => new InMemoryMessageRepository();
  const server = createApp(
    callRepo,
    new InMemoryBranchRepository(callRepo, messages),
    messages,
    'memory',
    { accuracyAnalyzer, accuracyRepo },
  ).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/api/accuracy/analyze` };
}

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
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
let noRepo: { server: Server; url: string };

beforeAll(async () => {
  configured = await start(new LlmAccuracyAnalyzer(new FakeLlm(script), new FakeRetriever()));
  unconfigured = await start(null);
  broken = await start(
    new LlmAccuracyAnalyzer(new FakeLlm({ ...script, extract: () => 'nope' }), new FakeRetriever()),
  );
  noRepo = await start(new LlmAccuracyAnalyzer(new FakeLlm(script), new FakeRetriever()), null);
});

afterAll(async () => {
  for (const { server } of [configured, unconfigured, broken, noRepo]) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('POST /api/accuracy/analyze', () => {
  it('returns the accuracy result', async () => {
    const response = await post(configured.url, valid);
    const body = (await response.json()) as AnalyzeAccuracyOutputData;

    expect(response.status).toBe(200);
    expect(body.accuracy.score).toBe(100);
    expect(body.accuracy.documents.required[0]?.source).toBe('docs/returns-policy.md');
  });

  it('answers 400 for an empty or too long transcript', async () => {
    expect((await post(configured.url, { messages: [] })).status).toBe(400);

    const long = { role: 'agent', content: 'x'.repeat(4000) };
    const response = await post(configured.url, { messages: Array(8).fill(long) });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('too long');
  });

  it('answers 400 for malformed JSON and 413 for an oversized body', async () => {
    expect((await post(configured.url, '{not json')).status).toBe(400);
    expect((await post(configured.url, { padding: 'x'.repeat(200_000) })).status).toBe(413);
  });

  it('answers 503 when accuracy analysis is not configured', async () => {
    expect((await post(unconfigured.url, valid)).status).toBe(503);
  });

  it('answers 502 when the model keeps returning unusable output', async () => {
    expect((await post(broken.url, valid)).status).toBe(502);
  });
});

describe('call-scoped accuracy routes', () => {
  const api = (ctx: { url: string }) => ctx.url.replace('/accuracy/analyze', '');

  it('analyzes a stored call, saves the result, and serves it back', async () => {
    const base = api(configured);

    expect((await fetch(`${base}/calls/call-1001/accuracy`)).status).toBe(404);

    const analyzed = await fetch(`${base}/calls/call-1001/accuracy`, { method: 'POST' });
    const analyzedBody = (await analyzed.json()) as AnalyzeAccuracyOutputData;
    expect(analyzed.status).toBe(200);
    expect(analyzedBody.accuracy.analyzedAt).toBeTruthy();

    const saved = await fetch(`${base}/calls/call-1001/accuracy`);
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as AnalyzeAccuracyOutputData).accuracy).toEqual(
      analyzedBody.accuracy,
    );
  });

  it('answers 404 when analyzing a call that does not exist', async () => {
    const response = await fetch(`${api(configured)}/calls/nope/accuracy`, { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('answers 503 when accuracy analysis is not configured', async () => {
    const response = await fetch(`${api(unconfigured)}/calls/call-1001/accuracy`, {
      method: 'POST',
    });
    expect(response.status).toBe(503);
  });

  it('deletes the saved result along with the call', async () => {
    const base = api(configured);
    await fetch(`${base}/calls/call-1002/accuracy`, { method: 'POST' });
    expect((await fetch(`${base}/calls/call-1002/accuracy`)).status).toBe(200);

    expect((await fetch(`${base}/calls/call-1002`, { method: 'DELETE' })).status).toBe(204);
    expect((await fetch(`${base}/calls/call-1002/accuracy`)).status).toBe(404);
  });

  it('answers 503 for saved results when no accuracy repository is configured', async () => {
    const base = api(noRepo);

    expect((await fetch(`${base}/calls/call-1001/accuracy`, { method: 'POST' })).status).toBe(503);
    expect((await fetch(`${base}/calls/call-1001/accuracy`)).status).toBe(503);
  });

  it('still analyzes a transcript from the request body without an accuracy repository', async () => {
    expect((await post(noRepo.url, valid)).status).toBe(200);
  });
});

describe('branch-scoped accuracy routes', () => {
  const api = (ctx: { url: string }) => ctx.url.replace('/accuracy/analyze', '');

  it('analyzes a stored branch, saves the result, and serves it back', async () => {
    const base = `${api(configured)}/calls/call-1001/branches/branch-2001`;

    expect((await fetch(`${base}/accuracy`)).status).toBe(404);

    const analyzed = await fetch(`${base}/accuracy`, { method: 'POST' });
    const analyzedBody = (await analyzed.json()) as AnalyzeAccuracyOutputData;
    expect(analyzed.status).toBe(200);
    expect(analyzedBody.accuracy.analyzedAt).toBeTruthy();

    const saved = await fetch(`${base}/accuracy`);
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as AnalyzeAccuracyOutputData).accuracy).toEqual(
      analyzedBody.accuracy,
    );
  });

  it('keeps a branch result separate from its parent call', async () => {
    const base = api(configured);
    await fetch(`${base}/calls/call-1002/branches/branch-2002/accuracy`, { method: 'POST' });

    expect((await fetch(`${base}/calls/call-1002/accuracy`)).status).toBe(404);
  });

  it('answers 404 when analyzing a branch that does not exist', async () => {
    const response = await fetch(`${api(configured)}/calls/call-1001/branches/nope/accuracy`, {
      method: 'POST',
    });
    expect(response.status).toBe(404);
  });

  it('answers 503 when accuracy analysis is not configured', async () => {
    const response = await fetch(
      `${api(unconfigured)}/calls/call-1001/branches/branch-2001/accuracy`,
      { method: 'POST' },
    );
    expect(response.status).toBe(503);
  });

  it('deletes the saved result along with the branch', async () => {
    const base = api(configured);
    const path = `${base}/calls/call-1002/branches/branch-2002`;
    await fetch(`${path}/accuracy`, { method: 'POST' });
    expect((await fetch(`${path}/accuracy`)).status).toBe(200);

    expect((await fetch(path, { method: 'DELETE' })).status).toBe(204);
    expect((await fetch(`${path}/accuracy`)).status).toBe(404);
  });
});
