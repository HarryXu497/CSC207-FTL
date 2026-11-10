export interface LlmRequest {
  /** Standing instructions: the model's role and rules. */
  system: string;
  /** The task input. */
  user: string;
}

/**
 * Provider-agnostic text completion. Callers own prompting and parsing, so swapping the model
 * (or faking it in tests) never touches analysis logic.
 */
export interface LlmClient {
  /** Returns the model's raw text reply. */
  complete(request: LlmRequest): Promise<string>;
}
