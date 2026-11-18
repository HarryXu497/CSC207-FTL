/**
 * The accuracy route through the real Express app, to check it is mounted and unconfigured by default.
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createMessageRepositoryBuilder,
  InMemoryBranchRepository,
  InMemoryCallRepository,
} from 'src/repository';
import { createApp } from 'src/server';
import { AnalyzeAccuracyInteractor } from 'src/service/accuracy/AnalyzeAccuracy';
import { FakeLlm, FakeRetriever, json } from 'src/service/accuracy/testing';
import { afterAll, describe, expect, it } from 'vitest';

const servers: Server[] = [];

function start(withAccuracy: boolean) {
  const callRepo = new InMemoryCallRepository();
  const messages = createMessageRepositoryBuilder('memory');
  const interactor = withAccuracy
    ? new AnalyzeAccuracyInteractor(
        new FakeLlm({
          extract: () => json({ claims: [] }),
          classify: () => json({ documents: [] }),
        }),
        new FakeRetriever([]),
      )
    : null;
  const app = createApp(
    callRepo,
    new InMemoryBranchRepository(callRepo, messages),
    messages,
    'memory',
    null,
    interactor,
  );
  const server = app.listen(0);
  servers.push(server);
  return new Promise<string>((resolve) =>
    server.once('listening', () =>
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/accuracy/analyze`),
    ),
  );
}

const post = (url: string) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'customer', content: 'Hi' }] }),
  });

afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
});

describe('accuracy route in the app', () => {
  it('is mounted and answers 200 when configured', async () => {
    expect((await post(await start(true))).status).toBe(200);
  });

  it('answers 503, instead of failing the server, when not configured', async () => {
    expect((await post(await start(false))).status).toBe(503);
  });
});
