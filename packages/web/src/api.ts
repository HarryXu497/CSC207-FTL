import type { ApiErrorBody } from '@recall/server/entities';
import type { GetCallsResponse } from '@recall/server/service/calls/GetCalls';
import type { CreateCallRequest, CreateCallResponse } from '@recall/server/service/calls/PostCalls';

const BASE_URL = '/api';

// Makes request and returns response body casted as type T
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error.message;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

// Singleton object for making requests
export const api = {
  listCalls: () => request<GetCallsResponse>('/calls'),

  createCall: (body: CreateCallRequest) =>
    request<CreateCallResponse>('/calls', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
