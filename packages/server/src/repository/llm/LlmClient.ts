export interface LlmRequest {
  system: string;
  user: string;
}

/** Unlike ChatModel, keeps the instructions apart from the untrusted user text. */
export interface LlmClient {
  complete(request: LlmRequest): Promise<string>;
}
