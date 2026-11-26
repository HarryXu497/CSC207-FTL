// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import type { Message } from '@recall/server/entities';
import { describe, expect, it } from 'vitest';
import Conversation from './Conversation';
import { messageAnchorId } from '../messageLinks';

const messages: Message[] = ['first', 'last'].map((id) => ({
  id,
  role: 'agent',
  content: id,
  createdAt: '2026-01-01T12:00:00Z',
}));

describe('practice conversation divider', () => {
  it.each([
    { name: 'empty practice', transcript: [], contextMessageCount: 0 },
    { name: 'no original context', transcript: messages, contextMessageCount: 0 },
    { name: 'only original context', transcript: messages, contextMessageCount: messages.length },
  ])('marks the boundary once for $name', ({ transcript, contextMessageCount }) => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <Conversation
        messages={transcript}
        sentimentMap={new Map()}
        title="Practice"
        contextMessageCount={contextMessageCount}
      />,
    );
    const dividers = container.querySelectorAll(
      '[role="separator"][aria-label="Practice starts here"]',
    );
    expect(dividers).toHaveLength(1);
    const divider = dividers[0]!;
    const body = container.querySelector('.conversationBody')!;

    if (contextMessageCount === 0) {
      expect(body.firstElementChild).toBe(divider);
      if (transcript.length) expect(divider.nextElementSibling?.id).toBe(messageAnchorId('first'));
      expect(body.textContent).not.toContain('Original call context');
    } else {
      expect(body.lastElementChild).toBe(divider);
      expect(divider.previousElementSibling?.id).toBe(messageAnchorId('last'));
      expect(body.textContent).toContain('Original call context');
    }
    if (!transcript.length)
      expect(body.textContent).toContain('This practice has no messages yet.');
  });
});
