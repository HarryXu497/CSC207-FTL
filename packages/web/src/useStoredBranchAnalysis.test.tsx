// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import {
  useStoredBranchAnalysis,
  type StoredAnalysisClient,
  type StoredBranchAnalysis,
} from './useStoredBranchAnalysis';

interface Result {
  messageIds: string[];
  value: string;
}

const result: Result = { messageIds: ['message-1'], value: 'saved' };
let client: StoredAnalysisClient<Result>;
let container: HTMLDivElement;
let root: Root;

function Harness({ enabled, revision }: { enabled: boolean; revision: string }) {
  const analysis = useStoredBranchAnalysis('call-1', 'branch-1', enabled, client, revision);
  return (
    <>
      <output>{JSON.stringify(analysis)}</output>
      <button onClick={() => void analysis.analyze()}>Analyze</button>
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  client = {
    label: 'Accuracy',
    read: vi.fn<StoredAnalysisClient<Result>['read']>().mockResolvedValue(result),
    analyze: vi.fn<StoredAnalysisClient<Result>['analyze']>().mockResolvedValue(result),
    getRevision: (data) => JSON.stringify(data.messageIds),
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(enabled = true, revision = JSON.stringify(result.messageIds)) {
  await act(async () => root.render(<Harness enabled={enabled} revision={revision} />));
}

function state() {
  return JSON.parse(container.querySelector('output')!.textContent!) as Omit<
    StoredBranchAnalysis<Result>,
    'analyze'
  >;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function analyze() {
  await act(async () => container.querySelector('button')!.click());
}

describe('useStoredBranchAnalysis', () => {
  it('treats a saved-result 404 as nothing saved and waits until enabled', async () => {
    vi.mocked(client.read).mockRejectedValueOnce(new ApiError(404, 'Nothing saved.'));
    await render(false);
    expect(client.read).not.toHaveBeenCalled();
    await render();
    expect(state()).toMatchObject({ data: null, error: null, loading: false });
  });

  it('blocks overlapping work and records the server snapshot when messages arrive during analysis', async () => {
    const loading = deferred<Result>();
    const pending = deferred<Result>();
    vi.mocked(client.read).mockReturnValueOnce(loading.promise);
    vi.mocked(client.analyze).mockReturnValueOnce(pending.promise);
    await render();
    await analyze();
    expect(client.analyze).not.toHaveBeenCalled();

    await act(async () => loading.resolve(result));
    await act(async () => {
      container.querySelector('button')!.click();
      container.querySelector('button')!.click();
    });
    expect(client.analyze).toHaveBeenCalledOnce();
    expect(state().analyzing).toBe(true);

    await render(true, JSON.stringify(['message-1', 'later-message']));
    await act(async () => pending.resolve(result));
    expect(state()).toMatchObject({
      analyzing: false,
      data: result,
      analyzedRevision: JSON.stringify(['message-1']),
    });
  });

  it.each(['read', 'analyze'] as const)(
    'aborts an in-flight %s on unmount and ignores its late result',
    async (operation) => {
      const pending = deferred<Result>();
      vi.mocked(client[operation]).mockReturnValueOnce(pending.promise);
      await render();
      if (operation === 'analyze') await analyze();
      const signal = vi.mocked(client[operation]).mock.calls[0]![2];
      expect(signal.aborted).toBe(false);

      await act(async () => root.render(null));
      expect(signal.aborted).toBe(true);
      await act(async () => pending.resolve(result));
      expect(container.textContent).toBe('');
    },
  );

  it.each([
    [400, 'The transcript is too long.', 'The transcript is too long.'],
    [404, 'Missing branch.', 'Accuracy analysis is unavailable for this practice right now.'],
    [503, 'Service disabled.', 'Accuracy analysis is unavailable for this practice right now.'],
    [500, 'Internal detail.', 'Could not complete accuracy analysis. Try again.'],
  ])(
    'shows the appropriate analysis error for HTTP %i and allows a retry',
    async (status, message, expected) => {
      vi.mocked(client.analyze).mockRejectedValueOnce(new ApiError(status, message));
      await render();
      await analyze();
      expect(state()).toMatchObject({ error: expected, analyzing: false });
      await analyze();
      expect(client.analyze).toHaveBeenCalledTimes(2);
      expect(state()).toMatchObject({ error: null, data: result, analyzing: false });
    },
  );

  it('restores the saved transcript revision after remount without running analysis', async () => {
    await render();
    await act(async () => root.render(null));
    await render();

    expect(client.read).toHaveBeenCalledTimes(2);
    expect(client.analyze).not.toHaveBeenCalled();
    expect(state()).toMatchObject({
      data: result,
      loading: false,
      analyzing: false,
      error: null,
      analyzedRevision: JSON.stringify(result.messageIds),
    });
  });
});
