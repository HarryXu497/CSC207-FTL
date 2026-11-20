import type { TranscriptMessage } from 'src/entities';
import { describe, expect, it } from 'vitest';
import { LlmAccuracyAnalyzer } from './LlmAccuracyAnalyzer';
import { FakeLlm, FakeRetriever, json, type Script } from './testing';

const transcript: TranscriptMessage[] = [
  { role: 'customer', content: 'I want to return my headphones. What is your policy?' },
  { role: 'agent', content: 'Hi, sorry to hear that!' },
  {
    role: 'agent',
    content: 'Returns are accepted within 30 days, and refunds take 3 business days.',
  },
];

function statementOf(prompt: string): string {
  return /Agent statement: (.*)/.exec(prompt)?.[1] ?? '';
}

// The returns policy supports the first claim (30 days) and contradicts the second (it says 5 to 7
// business days, not 3).
const script: Script = {
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

async function analyze(overrides: Script, messages = transcript) {
  const llm = new FakeLlm({ ...script, ...overrides });
  const findings = await new LlmAccuracyAnalyzer(llm, new FakeRetriever()).analyze(messages);
  return { llm, findings };
}

describe('LlmAccuracyAnalyzer', () => {
  it('judges each claim and sorts the documents it found', async () => {
    const { findings } = await analyze({});

    expect(findings.claims.map((c) => c.verdict)).toEqual(['supported', 'contradicted']);
    expect(findings.documents.required).toEqual([
      { source: 'docs/returns-policy.md', reason: 'Governs returns.', usedByAgent: true },
    ]);
    expect(findings.documents.recommended[0]?.usedByAgent).toBe(false);
  });

  it('downgrades a verdict whose quote is not in the retrieved document', async () => {
    const { findings } = await analyze({
      judge: () =>
        json({
          verdict: 'supported',
          confidence: 0.99,
          evidenceChunk: 1,
          quote: 'Items may be returned within 90 days.',
          explanation: 'Looks right.',
        }),
    });

    expect(findings.claims[0]?.verdict).toBe('unsupported');
    expect(findings.claims[0]?.evidence).toBeNull();
  });

  it('drops claims that do not come from an agent message', async () => {
    const { findings } = await analyze({
      extract: () =>
        json({
          claims: [
            { messageIndex: 0, text: 'Customer claim' },
            { messageIndex: 99, text: 'Ghost claim' },
            { messageIndex: 2, text: 'Returns take 30 days.' },
          ],
        }),
    });

    expect(findings.claims.map((c) => c.text)).toEqual(['Returns take 30 days.']);
  });

  it('marks a claim it cannot judge as not_verifiable instead of failing', async () => {
    const { findings } = await analyze({
      judge: (req) =>
        statementOf(req.user).includes('3 business days') ? 'not json' : script.judge!(req),
    });

    expect(findings.claims.map((c) => c.verdict)).toEqual(['supported', 'not_verifiable']);
  });

  it('makes no extract or judge calls when the agent said nothing', async () => {
    const { llm, findings } = await analyze({}, [transcript[0]!]);

    expect(llm.requests.every((r) => r.system.includes('decide which knowledge-base'))).toBe(true);
    expect(findings.claims).toEqual([]);
  });
});
