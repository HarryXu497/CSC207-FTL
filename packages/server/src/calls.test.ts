/**
 * The payoff of the repository interface, in one file.
 *
 * These tests start the REAL Express app and talk to it over REAL HTTP, but hand
 * it an in-memory repository. No database, no credentials, no network. They run
 * in milliseconds - which would be impossible if `routes.ts` imported Firestore
 * directly.
 *
 * Vitest reads like pytest: describe = a test class, it = a test function,
 * expect(x).toBe(y) = assert x == y.
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ListCallsResponse } from '@recall/shared';
import { createApp } from './app';
import { InMemoryCallRepository } from './InMemoryCallRepository';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp(new InMemoryCallRepository(), 'memory');
  /* Port 0 means "any free port", so the suite cannot collide with a dev server
     you forgot to stop. */
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  /* Leaving the socket open would hang the test process. */
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('GET /api/calls', () => {
  it('returns the seeded calls, newest first', async () => {
    const response = await fetch(`${baseUrl}/calls`);
    const body = (await response.json()) as ListCallsResponse;

    expect(response.status).toBe(200);
    expect(body.calls).toHaveLength(2);
    expect(body.calls[0]?.id).toBe('call-1002');
  });
});

describe('POST /api/calls', () => {
  it('stores a new call and returns 201', async () => {
    const response = await fetch(`${baseUrl}/calls`, {
      method: 'POST',
      /* Without this header, Express ignores the body and req.body is empty. */
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Marcus Webb', topic: 'Billing query', score: 72 }),
    });

    expect(response.status).toBe(201);

    /* And it is actually readable back - a write test that never re-reads proves
       very little. */
    const list = (await (await fetch(`${baseUrl}/calls`)).json()) as ListCallsResponse;
    expect(list.calls.some((c) => c.customerName === 'Marcus Webb')).toBe(true);
  });

  it('rejects a bad score with a 400 naming the field', async () => {
    /* TypeScript could never stop this request. Only runtime validation can. */
    const response = await fetch(`${baseUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'X', topic: 'Y', score: 500 }),
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('score');
  });
});
