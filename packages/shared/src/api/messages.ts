import type { Message } from '../repository/database/message';

/**
 * GET /api/calls/:callId/messages or
 * GET /api/calls/:callId/branches/:branchId/messages
 */
export interface GetMessagesResponse {
  messages: Message[];
}

/**
 * POST /api/calls/:callId/messages or
 * POST /api/calls/:callId/branches/:branchId/messages
 */
export interface CreateMessageRequest {
  role: 'agent' | 'customer';
  content: string;
  createdAt: string;
}

export interface CreateMessageResponse {
  message: Message;
}
