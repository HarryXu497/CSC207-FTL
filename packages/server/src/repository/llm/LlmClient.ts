export interface LlmRequest {
  /** Instructions for the model. */
  system: string;
  /** The task input. */
  user: string;
}

/** Provider-agnostic text completion, so the model can be swapped or faked in tests. */
export interface LlmClient {
  /** Returns the model's raw text reply. */
  complete(request: LlmRequest): Promise<string>;
}
