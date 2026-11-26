// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('useStoredBranchAnalysis', () => {
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
