/**
 * Integration tests
 */
import type { Call, GetCallsResponse } from '@recall/shared';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from 'src/server/app';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
    const body = (await response.json()) as GetCallsResponse;

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
      body: JSON.stringify({ customerName: 'Marcus Webb', topic: 'Billing query' }),
    });

    expect(response.status).toBe(201);

    const listRes = await fetch(`${baseUrl}/calls`);
    const list = (await listRes.json()) as GetCallsResponse;
    expect(list.calls.some((c: Call) => c.customerName === 'Marcus Webb')).toBe(true);
  });

  it('rejects a missing customerName with a 400', async () => {
    const response = await fetch(`${baseUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Y' }),
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('customerName');
  });
});
