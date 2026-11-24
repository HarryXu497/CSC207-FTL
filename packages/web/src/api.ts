import type { ApiErrorBody } from '@recall/server/entities';
import type {
  ListCallSentimentsOutputData,
  CreateCallInputData,
  CreateCallOutputData,
  ListCallsOutputData,
  GetCallOutputData,
  GetBranchOutputData,
  ListCallBranchesOutputData,
  ListMessagesOutputData,
  CreateBranchInputData,
  CreateBranchOutputData,
  PostMessageInputData,
  PostMessageOutputData,
  SimulateMessageInputData,
  SimulateMessageOutputData,
} from '@recall/server/service';
import type { WithError } from '@recall/server/entities';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Makes request and returns response body casted as type T
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      if (typeof body.error?.message === 'string' && body.error.message.trim()) {
        message = body.error.message;
      }
    } catch {
      // keep the generic message
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

interface CreateCallRequestBody {
  callData: Omit<CreateCallInputData['callData'], 'createdAt'>;
  messageData: CreateCallInputData['messageData'];
}

function branchPath(callId: string, branchId: string): string {
  return `/calls/${encodeURIComponent(callId)}/branches/${encodeURIComponent(branchId)}`;
}

// Singleton object for making requests
export const api = {
  listCalls: () => request<WithError<ListCallsOutputData>>('/calls'),

  getCall: (callId: string) =>
    request<WithError<GetCallOutputData>>(`/calls/${encodeURIComponent(callId)}`),

  listBranches: (callId: string, signal?: AbortSignal) =>
    request<ListCallBranchesOutputData>(`/calls/${encodeURIComponent(callId)}/branches`, {
      signal,
    }),

  getBranch: (callId: string, branchId: string, signal?: AbortSignal) =>
    request<GetBranchOutputData>(branchPath(callId, branchId), { signal }),

  getCallMessages: (callId: string, signal?: AbortSignal) =>
    request<ListMessagesOutputData>(`/calls/${encodeURIComponent(callId)}/messages`, { signal }),

  getBranchMessages: (callId: string, branchId: string, signal?: AbortSignal) =>
    request<ListMessagesOutputData>(`${branchPath(callId, branchId)}/messages`, { signal }),

  createBranch: (callId: string, body: Omit<CreateBranchInputData, 'callId'>) =>
    request<CreateBranchOutputData>(`/calls/${encodeURIComponent(callId)}/branches`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  postBranchMessage: (
    callId: string,
    branchId: string,
    body: PostMessageInputData['messageData'],
  ) =>
    request<PostMessageOutputData>(`${branchPath(callId, branchId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  simulateMessage: (
    callId: string,
    branchId: string,
    body: Pick<SimulateMessageInputData, 'expectedLastMessageId'>,
  ) =>
    request<SimulateMessageOutputData>(`${branchPath(callId, branchId)}/simulate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
