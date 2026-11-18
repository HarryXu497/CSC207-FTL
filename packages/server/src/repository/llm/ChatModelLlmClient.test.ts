import { describe, expect, it } from 'vitest';
import type { ChatModel } from '../rag/llm/ChatModel';
import { ChatModelLlmClient } from './ChatModelLlmClient';

describe('ChatModelLlmClient', () => {
  it('sends the system and user text to the chat model in one prompt and returns its reply', async () => {
    const prompts: string[] = [];
    const model: ChatModel = {
      invoke: async (prompt) => {
        prompts.push(prompt);
        return 'reply';
      },
    };

    const reply = await new ChatModelLlmClient(model).complete({
      system: 'You are strict.',
      user: 'Check this.',
    });

    expect(reply).toBe('reply');
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('You are strict.');
    expect(prompts[0]).toContain('Check this.');
    expect(prompts[0]?.indexOf('You are strict.')).toBeLessThan(
      prompts[0]?.indexOf('Check this.') ?? -1,
    );
  });
});
