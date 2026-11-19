import type { TranscriptMessage } from 'src/entities';
import { describe, expect, it } from 'vitest';
import type { AnalyzeAccuracyInputData } from './input';
import { AnalyzeAccuracyInteractor } from './interactor';
import { FakeLlm, FakeRetriever, RecordingPresenter, json, type Script } from './testing';

const NOW = new Date('2026-11-04T12:00:00.000Z');

const transcript: TranscriptMessage[] = [
  { role: 'customer', content: 'I want to return my headphones. What is your policy?' },
  { role: 'agent', content: 'Hi, sorry to hear that!' },
  {
    role: 'agent',
    content: 'Returns are accepted within 30 days, and refunds take 3 business days.',
  },
];

/** The claim being judged, read from the judge prompt. */
function statementOf(prompt: string): string {
  return /Agent statement: (.*)/.exec(prompt)?.[1] ?? '';
}

// The agent makes two claims. The returns policy supports the first (30 days) and contradicts the
// second (it says 5 to 7 business days, not 3).
const goodScript: Script = {
  extract: () =>
    json({
      claims: [
        { messageIndex: 2, text: 'Returns are accepted within 30 days of delivery.' },
        { messageIndex: 2, text: 'Refunds are issued within 3 business days.' },
      ],
    }),
  judge: (req) =>
    statementOf(req.user).includes('30 days')
      ? json({
          verdict: 'supported',
          confidence: 0.95,
          evidenceChunk: 1,
          quote: 'Items may be returned within 30 days of delivery.',
          explanation: 'The policy gives a 30 day window.',
        })
      : json({
          verdict: 'contradicted',
          confidence: 0.9,
          evidenceChunk: 1,
          quote: 'Refunds are issued within 5 to 7 business days',
          explanation: 'The policy says 5 to 7 business days, not 3.',
        }),
  classify: () =>
    json({
      documents: [
        { source: 'docs/returns-policy.md', role: 'required', reason: 'Governs returns.' },
        { source: 'docs/shipping-guide.md', role: 'recommended', reason: 'Return labels.' },
      ],
    }),
};

async function run(script: Script, input: AnalyzeAccuracyInputData) {
  const llm = new FakeLlm(script);
  const interactor = new AnalyzeAccuracyInteractor(llm, new FakeRetriever(), {}, () => NOW);
  const presenter = new RecordingPresenter();
  await interactor.handle(input, presenter);
  return { llm, presenter };
}

describe('AnalyzeAccuracyInteractor', () => {
  it('judges each claim, classifies documents, and scores', async () => {
    const { accuracy } = (await run(goodScript, { messages: transcript })).presenter;

    expect(accuracy.claims.map((c) => c.verdict)).toEqual(['supported', 'contradicted']);
    // Both claims cite the required document, so both weigh 2: (2*1 + 2*0) / 4.
    expect(accuracy.score).toBe(50);
    expect(accuracy.documents.required).toEqual([
      { source: 'docs/returns-policy.md', reason: 'Governs returns.', usedByAgent: true },
    ]);
    expect(accuracy.documents.recommended[0]?.usedByAgent).toBe(false);
  });

  it('flags a required document the agent never used', async () => {
    const script = { ...goodScript, extract: () => json({ claims: [] }) };
    const { accuracy } = (await run(script, { messages: transcript })).presenter;

    expect(accuracy.score).toBeNull();
    expect(accuracy.documents.required[0]?.usedByAgent).toBe(false);
  });

  it('downgrades a verdict whose quote is not in the retrieved document', async () => {
    const script = {
      ...goodScript,
      judge: () =>
        json({
          verdict: 'supported',
          confidence: 0.99,
          evidenceChunk: 1,
          quote: 'Items may be returned within 90 days.',
          explanation: 'Looks right.',
        }),
    };
    const [claim] = (await run(script, { messages: transcript })).presenter.accuracy.claims;

    expect(claim?.verdict).toBe('unsupported');
    expect(claim?.evidence).toBeNull();
  });

  it('drops claims that do not come from an agent message', async () => {
    const script = {
      ...goodScript,
      extract: () =>
        json({
          claims: [
            { messageIndex: 0, text: 'Customer claim' },
            { messageIndex: 99, text: 'Ghost claim' },
            { messageIndex: 2, text: 'Returns take 30 days.' },
          ],
        }),
    };
    const { accuracy } = (await run(script, { messages: transcript })).presenter;
    expect(accuracy.claims.map((c) => c.text)).toEqual(['Returns take 30 days.']);
  });

  it('leaves a claim that cannot be judged out of the score', async () => {
    const script = {
      ...goodScript,
      judge: (req: Parameters<NonNullable<Script['judge']>>[0]) =>
        statementOf(req.user).includes('3 business days') ? 'not json' : goodScript.judge!(req),
    };
    const { accuracy } = (await run(script, { messages: transcript })).presenter;

    expect(accuracy.claims[1]?.verdict).toBe('not_verifiable');
    expect(accuracy.score).toBe(100);
  });

  it('makes no LLM calls when the agent said nothing', async () => {
    const { llm, presenter } = await run(goodScript, { messages: [transcript[0]!] });

    expect(llm.count('extract') + llm.count('judge')).toBe(0);
    expect(presenter.accuracy.score).toBeNull();
  });

  it('presents a model failure when claims cannot be extracted', async () => {
    const { presenter } = await run(
      { ...goodScript, extract: () => 'nope' },
      {
        messages: transcript,
      },
    );

    expect(presenter.modelFailed).toBe(true);
    expect(presenter.output).toBeNull();
  });
});
