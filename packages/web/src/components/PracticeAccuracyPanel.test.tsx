// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import type { Accuracy, ClaimResult, Message } from '@recall/server/entities';
import { describe, expect, it, vi } from 'vitest';
import PracticeAccuracyPanel from './PracticeAccuracyPanel';
import { messageAnchorHref } from '../messageLinks';

const messages: Message[] = ['new-agent', 'analyzed-agent'].map((id) => ({
  id,
  role: 'agent',
  content: id,
  createdAt: '2026-01-01T12:00:00Z',
}));
const claim: ClaimResult = {
  messageIndex: 0,
  messageId: 'analyzed-agent',
  text: 'The trial lasts 14 days.',
  verdict: 'supported',
  confidence: 1,
  explanation: 'Matches the trial policy.',
  evidence: null,
};

function renderPanel(source: ClaimResult, analyzedRevision: string | null = null) {
  const accuracy: Accuracy = {
    claims: [source],
    documents: { required: [], recommended: [] },
    claimsTruncated: false,
    promptVersion: 'test',
    score: 100,
    counts: { supported: 1, contradicted: 0, unsupported: 0, not_verifiable: 0 },
    analyzedAt: '2026-01-01T12:01:00Z',
  };
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <PracticeAccuracyPanel
      messages={messages}
      revision={JSON.stringify(messages.map(({ id }) => id))}
      analysis={{
        data: { accuracy },
        loading: false,
        analyzing: false,
        error: null,
        analyzedRevision,
        analyze: vi.fn(),
      }}
    />,
  );
  return container;
}

describe('practice accuracy feedback', () => {
  it('distinguishes current, outdated, and legacy saved results without demanding reanalysis', () => {
    const current = renderPanel(claim, JSON.stringify(messages.map(({ id }) => id)));
    expect(current.querySelector('[role="status"]')).toBeNull();
    expect(current.textContent).not.toContain('newer messages may not be included');

    const outdated = renderPanel(claim, JSON.stringify(['analyzed-agent']));
    expect(outdated.querySelector('[role="status"]')?.textContent).toContain(
      'New messages need accuracy analysis.',
    );

    const legacy = renderPanel(claim);
    expect(legacy.textContent).toContain('Saved result; newer messages may not be included.');
    expect(legacy.textContent).not.toContain('Analyze again');
  });

  it('links to the saved message ID after transcript positions change', () => {
    const container = renderPanel(claim);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe(messageAnchorHref('analyzed-agent'));
    expect(link?.textContent).toBe('Agent message 2');
  });

  it.each([undefined, 'missing-agent', ''])(
    'does not guess a message from its old index when the ID is %s',
    (messageId) => {
      const container = renderPanel({ ...claim, messageId });
      expect(container.querySelector('a')).toBeNull();
      expect(container.textContent).toContain('Source message unavailable');
    },
  );
});
