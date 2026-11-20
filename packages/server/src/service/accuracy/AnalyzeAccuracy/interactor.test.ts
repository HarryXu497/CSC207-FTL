import type { AccuracyFindings } from 'src/entities';
import { LlmOutputError } from 'src/errors';
import { InMemoryAccuracyRepository, type AccuracyAnalyzer } from 'src/repository';
import { describe, expect, it } from 'vitest';
import { AnalyzeAccuracyInteractor } from './interactor';
import type { AnalyzeAccuracyOutputBoundary, AnalyzeAccuracyOutputData } from './output';

const NOW = new Date('2026-11-04T12:00:00.000Z');

const findings: AccuracyFindings = {
  claims: [
    {
      messageIndex: 1,
      text: 'Returns are accepted within 30 days.',
      verdict: 'supported',
      confidence: 0.9,
      explanation: 'Matches the policy.',
      evidence: { source: 'returns.md', quote: 'within 30 days' },
    },
    {
      messageIndex: 1,
      text: 'Shipping is always free.',
      verdict: 'contradicted',
      confidence: 0.8,
      explanation: 'Only over $50.',
      evidence: { source: 'shipping.md', quote: 'orders over $50' },
    },
  ],
  documents: {
    required: [{ source: 'returns.md', reason: 'Governs returns.', usedByAgent: true }],
    recommended: [{ source: 'shipping.md', reason: 'Return labels.', usedByAgent: true }],
  },
  claimsTruncated: false,
  promptVersion: 'test',
};

class RecordingPresenter implements AnalyzeAccuracyOutputBoundary {
  output: AnalyzeAccuracyOutputData | null = null;
  modelFailed = false;

  present(output: AnalyzeAccuracyOutputData): void {
    this.output = output;
  }

  presentModelFailure(): void {
    this.modelFailed = true;
  }

  presentBadRequest(): void {
    throw new Error('Unexpected presentBadRequest');
  }

  presentNotFound(): void {
    throw new Error('Unexpected presentNotFound');
  }

  presentServiceUnavailable(): void {
    throw new Error('Unexpected presentServiceUnavailable');
  }
}

async function run(
  analyzer: AccuracyAnalyzer,
  callId?: string,
  repo = new InMemoryAccuracyRepository(),
) {
  const presenter = new RecordingPresenter();
  await new AnalyzeAccuracyInteractor(analyzer, repo, () => NOW).handle(
    { callId, messages: [{ role: 'agent', content: 'x' }] },
    presenter,
  );
  return presenter;
}

describe('AnalyzeAccuracyInteractor', () => {
  it('scores the findings and presents them', async () => {
    const { output } = await run({ analyze: async () => findings });

    // The supported claim cites a required document, so it weighs 2: (2*1 + 1*0) / 3.
    expect(output?.accuracy.score).toBe(67);
    expect(output?.accuracy.counts.contradicted).toBe(1);
    expect(output?.accuracy.analyzedAt).toBe(NOW.toISOString());
  });

  it('presents a model failure when the model keeps returning unusable replies', async () => {
    const presenter = await run({
      analyze: async () => {
        throw new LlmOutputError('bad reply');
      },
    });

    expect(presenter.modelFailed).toBe(true);
    expect(presenter.output).toBeNull();
  });

  it('saves the result under the call id and presents the same result', async () => {
    const repo = new InMemoryAccuracyRepository();
    const { output } = await run({ analyze: async () => findings }, 'call-1', repo);

    expect(await repo.getAccuracyForCall('call-1')).toEqual(output?.accuracy);
  });

  it('does not save anything when there is no call id', async () => {
    const repo = new InMemoryAccuracyRepository();
    await run({ analyze: async () => findings }, undefined, repo);

    expect(await repo.getAccuracyForCall('call-1')).toBeNull();
  });

  it('does not save when the model fails', async () => {
    const repo = new InMemoryAccuracyRepository();
    await run(
      {
        analyze: async () => {
          throw new LlmOutputError('bad reply');
        },
      },
      'call-1',
      repo,
    );

    expect(await repo.getAccuracyForCall('call-1')).toBeNull();
  });
});
