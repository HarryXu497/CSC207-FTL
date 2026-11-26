// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Message } from '@recall/server/entities';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStream } from './useMessageStream';

class TestEventSource {
  static instances: TestEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(readonly url: string) {
    TestEventSource.instances.push(this);
  }

  send(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  fail() {
    this.onerror?.(new Event('error'));
  }
}

type StreamOptions = Parameters<typeof useMessageStream>[0];

function StreamStatus(props: StreamOptions) {
  const error = useMessageStream(props);
  return <output>{error}</output>;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('EventSource', TestEventSource);
  TestEventSource.instances = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderStream(options: StreamOptions) {
  await act(async () => root.render(<StreamStatus {...options} />));
}

describe('useMessageStream', () => {
  it('opens a stream only while enabled', async () => {
    const options = { callId: 'call /?', onMessages: vi.fn() };
    await renderStream({ ...options, enabled: false });
    expect(TestEventSource.instances).toHaveLength(0);

    await renderStream({ ...options, enabled: true });
    expect(TestEventSource.instances).toHaveLength(1);
    const source = TestEventSource.instances[0]!;
    expect(source.url).toBe('/api/calls/call%20%2F%3F/messages/stream');

    await renderStream({ ...options, enabled: false });
    expect(source.close).toHaveBeenCalledOnce();
    expect(TestEventSource.instances).toHaveLength(1);
  });

  it('recovers from connection and malformed-update errors on the next valid message', async () => {
    const onMessages = vi.fn<(messages: Message[]) => void>();
    await renderStream({ callId: 'call-1', branchId: 'branch-1', enabled: true, onMessages });
    const source = TestEventSource.instances[0]!;

    await act(async () => source.fail());
    expect(container.textContent).toBe('Live updates interrupted. Reconnecting…');
    expect(source.close).not.toHaveBeenCalled();

    for (const data of ['invalid JSON', '{}']) {
      await act(async () => source.send(data));
      expect(container.textContent).toBe('Could not read a conversation update.');
    }
    expect(onMessages).not.toHaveBeenCalled();

    const messages: Message[] = [
      { id: 'message-1', role: 'agent', content: 'Hello.', createdAt: '2026-01-01T12:00:00Z' },
    ];
    await act(async () => source.send(JSON.stringify(messages)));
    expect(onMessages).toHaveBeenCalledExactlyOnceWith(messages);
    expect(container.textContent).toBe('');
  });

  it('closes the old stream when switching branches and closes the new one on unmount', async () => {
    const options = { callId: 'call-1', enabled: true, onMessages: vi.fn() };
    await renderStream({ ...options, branchId: 'first-branch' });
    const first = TestEventSource.instances[0]!;

    await renderStream({ ...options, branchId: 'branch#2' });
    expect(first.close).toHaveBeenCalledOnce();
    expect(TestEventSource.instances).toHaveLength(2);
    const second = TestEventSource.instances[1]!;
    expect(second.url).toBe('/api/calls/call-1/branches/branch%232/messages/stream');

    await act(async () => root.render(null));
    expect(second.close).toHaveBeenCalledOnce();
    expect(first.close).toHaveBeenCalledOnce();
  });
});
