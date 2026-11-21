import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { EMOTION_LABELS, type Emotion } from 'src/entities';
import {
  AnalyseMessages,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  InMemoryMessageRepository,
  type EmotionClassifier,
  type Vad,
  type VadEstimator,
} from 'src/repository';
import { createApp } from 'src/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ListCallSentimentsOutputData } from './ListCallSentiments';

// Stand-ins for the transformer models, so the test needs no downloaded models.
const neutralClassifier: EmotionClassifier = {
  classify: async (): Promise<Emotion[]> =>
    EMOTION_LABELS.map((label) => ({ label, score: label === 'neutral' ? 1 : 0 })),
};
const flatVad: VadEstimator = {
  estimate: async (): Promise<Vad> => ({ valence: 0, arousal: 0.5, dominance: 0.5 }),
};

async function start(analyseMessages: AnalyseMessages | null) {
  const callRepo = new InMemoryCallRepository();
  const messages = () => new InMemoryMessageRepository();
  const server = createApp(
    callRepo,
    new InMemoryBranchRepository(callRepo, messages),
    messages,
    'memory',
    { analyseMessages },
  ).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, api: `http://127.0.0.1:${port}/api` };
}

let configured: { server: Server; api: string };
let unconfigured: { server: Server; api: string };

beforeAll(async () => {
  configured = await start(new AnalyseMessages(neutralClassifier, flatVad));
  unconfigured = await start(null);
});

afterAll(async () => {
  for (const { server } of [configured, unconfigured]) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('call-scoped sentiment routes', () => {
  it('analyzes a stored call, saves the result, and serves it back', async () => {
    const url = `${configured.api}/calls/call-1001/sentiment`;

    expect((await fetch(url)).status).toBe(404);

    const analyzed = await fetch(url, { method: 'POST' });
    const analyzedBody = (await analyzed.json()) as ListCallSentimentsOutputData;
    expect(analyzed.status).toBe(200);
    expect(analyzedBody.messageSentiments.length).toBeGreaterThan(0);

    const saved = await fetch(url);
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as ListCallSentimentsOutputData).messageSentiments).toEqual(
      analyzedBody.messageSentiments,
    );
  });

  it('answers 404 when analyzing a call that does not exist', async () => {
    const response = await fetch(`${configured.api}/calls/nope/sentiment`, { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('answers 503 when sentiment analysis is not configured', async () => {
    const response = await fetch(`${unconfigured.api}/calls/call-1001/sentiment`, {
      method: 'POST',
    });
    expect(response.status).toBe(503);
  });

  it('deletes the saved result along with the call', async () => {
    const url = `${configured.api}/calls/call-1002/sentiment`;
    await fetch(url, { method: 'POST' });
    expect((await fetch(url)).status).toBe(200);

    expect((await fetch(`${configured.api}/calls/call-1002`, { method: 'DELETE' })).status).toBe(
      204,
    );
    expect((await fetch(url)).status).toBe(404);
  });
});
