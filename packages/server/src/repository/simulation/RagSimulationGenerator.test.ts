import { LlmOutputError } from 'src/errors';
import { describe, expect, it, vi } from 'vitest';
import type { LlmClient } from '../llm';
import type { Retriever } from '../rag/retriever';
import { RagSimulationGenerator } from './RagSimulationGenerator';

const scenario = { customerName: 'Priya', topic: 'Damaged delivery' };
const history = [
  { role: 'customer', content: 'I ordered a blue lamp for my sister.' },
  { role: 'agent', content: 'How can I help with your order?' },
  { role: 'customer', content: 'The lamp arrived broken.' },
  { role: 'agent', content: 'When did it arrive?' },
  { role: 'customer', content: 'Yesterday.' },
  { role: 'agent', content: 'I can arrange a replacement. What is your order number?' },
] as const;

describe('RagSimulationGenerator', () => {
  it('searches recent context but gives the LLM the full history and retrieved documents', async () => {
    const documents = [
      {
        id: 'replacement-policy',
        content: 'Report damaged deliveries within 14 days for a replacement.',
        metadata: { source: 'replacement-policy.txt' },
      },
    ];
    const search = vi.fn<Retriever['search']>().mockResolvedValue(documents);
    const complete = vi
      .fn<LlmClient['complete']>()
      .mockResolvedValue('  My order number is 123.\n');
    const generator = new RagSimulationGenerator({ search }, { complete });

    expect(await generator.generate({ scenario, history })).toBe('My order number is 123.');

    expect(search).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Topic: Damaged delivery'),
      5,
    );
    const query = search.mock.calls[0]![0];
    expect(query).toContain(history[5].content);
    expect(query).not.toContain(history[0].content);

    expect(complete).toHaveBeenCalledTimes(1);
    const prompt = complete.mock.calls[0]![0];
    expect(prompt.system).toContain('You are the CUSTOMER');
    expect(JSON.parse(prompt.user)).toEqual({
      scenario,
      history,
      companyDocuments: [
        { id: documents[0]!.id, source: 'replacement-policy.txt', content: documents[0]!.content },
      ],
    });
  });

  it('generates a reply from the transcript when policy retrieval fails', async () => {
    const search = vi.fn<Retriever['search']>().mockRejectedValue(new Error('Chroma is down.'));
    const complete = vi.fn<LlmClient['complete']>().mockResolvedValue('Yesterday afternoon.');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const generator = new RagSimulationGenerator({ search }, { complete });

      await expect(generator.generate({ scenario, history })).resolves.toBe('Yesterday afternoon.');
      expect(JSON.parse(complete.mock.calls[0]![0].user)).toEqual({
        scenario,
        history,
        companyDocuments: [],
      });
    } finally {
      warning.mockRestore();
    }
  });

  it('rejects a blank reply, including when no company documents match', async () => {
    const retriever: Retriever = { search: async () => [] };
    const llm: LlmClient = { complete: async () => ' \n\t' };
    const generator = new RagSimulationGenerator(retriever, llm);

    await expect(generator.generate({ scenario, history })).rejects.toBeInstanceOf(LlmOutputError);
  });
});
