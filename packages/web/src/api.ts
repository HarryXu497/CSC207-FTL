/**
 * The only file in the browser app that calls `fetch`.
 *
 * Centralising it means every request gets the same headers and the same error
 * handling, and every response is typed against the shared contract - so a
 * component that misreads a field fails to compile instead of rendering
 * `undefined` on screen.
 */
import type {
  ApiErrorBody,
  CreateCallRequest,
  CreateCallResponse,
  ListCallsResponse,
} from '@recall/shared';

/* A RELATIVE url: no scheme, no host, no port. It means "same origin as this
   page", which the Vite dev server then proxies to Express. Hardcoding
   http://localhost:4000 here is the most common reason an app works locally and
   breaks the moment it is deployed. */
const BASE_URL = '/api';

/**
 * One request. `<T>` is what the caller expects back on success - the same idea
 * as `<T>` in Java.
 *
 * IMPORTANT: `fetch` only rejects when the network itself fails. A 404 or a 500
 * is a perfectly successful fetch as far as the browser is concerned, so you MUST
 * check `response.ok` yourself. Forgetting this is the classic JavaScript
 * networking bug - your error handler never runs and the UI renders nonsense.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    /* The server sends errors as JSON, but a crash upstream could send HTML - so
       parsing has to be allowed to fail. */
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error.message;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** Every endpoint the server exposes, as one object. */
export const api = {
  listCalls: () => request<ListCallsResponse>('/calls'),

  createCall: (body: CreateCallRequest) =>
    request<CreateCallResponse>('/calls', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
