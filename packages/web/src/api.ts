import type { ApiErrorBody } from '@recall/server/entities';
import type {
  ListCallSentimentsOutputData,
  CreateCallInputData,
  CreateCallOutputData,
  ListCallsOutputData,
  GetCallOutputData,
} from '@recall/server/service';
import type { WithError } from '@recall/server/entities';

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

interface CreateCallRequestBody {
  callData: Omit<CreateCallInputData['callData'], 'createdAt'>;
  messageData: CreateCallInputData['messageData'];
}

// Singleton object for making requests
export const api = {
  listCalls: () => request<WithError<ListCallsOutputData>>('/calls'),

  getCall: (callId: string) =>
    request<WithError<GetCallOutputData>>(`/calls/${encodeURIComponent(callId)}`),

  getCallSentiment: (callId: string, signal: AbortSignal) =>
    request<WithError<ListCallSentimentsOutputData>>(
      `/calls/${encodeURIComponent(callId)}/sentiment`,
      { signal },
    ),

  createCall: (body: CreateCallRequestBody) =>
    request<WithError<CreateCallOutputData>>('/calls', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
