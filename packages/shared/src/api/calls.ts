import type { Call } from '../repository/database/calls';

/** GET /api/calls */
export interface ListCallsResponse {
  calls: Call[];
}

/** POST /api/calls; server adds the id and createdAt fields */
export interface CreateCallRequest {
  customerName: string;
  topic: string;
}

export interface CreateCallResponse {
  call: Call;
}
