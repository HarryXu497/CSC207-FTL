/**
 * Integration tests
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
  // Port 0 corresponds to any free port
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Marcus Webb', topic: 'Billing query', score: 72 }),
    });

    expect(response.status).toBe(201);

    const list = (await (await fetch(`${baseUrl}/calls`)).json()) as ListCallsResponse;
    expect(list.calls.some((c) => c.customerName === 'Marcus Webb')).toBe(true);
  });

  it('rejects a bad score with a 400 naming the field', async () => {
    const response = await fetch(`${baseUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'X', topic: 'Y', score: 500 }),
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('score');
  });
});
