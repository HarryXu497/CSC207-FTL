/**
 * Represents a chat model that can prompted.
 */
export interface ChatModel {
  /**
   * Prompts the model with the given prompt.
   * @param prompt - The prompt for the model
   */
  invoke(prompt: string): Promise<string>;
}
