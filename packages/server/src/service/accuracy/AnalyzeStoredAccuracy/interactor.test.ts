import type { AccuracyFindings } from 'src/entities';
import { LlmOutputError } from 'src/errors';
import {
  InMemoryAccuracyRepository,
  InMemoryBranchRepository,
  InMemoryCallRepository,
  InMemoryMessageRepository,
  type AccuracyAnalyzer,
} from 'src/repository';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_MESSAGE_CHARS,
  type AnalyzeAccuracyOutputBoundary,
  type AnalyzeAccuracyOutputData,
  type ValidationIssue,
} from '../AnalyzeAccuracy';
import { AnalyzeStoredAccuracyInteractor } from './interactor';

const NOW = new Date('2026-11-04T12:00:00.000Z');

const findings: AccuracyFindings = {
  claims: [],
  documents: { required: [], recommended: [] },
  claimsTruncated: false,
  promptVersion: 'test',
};

class RecordingPresenter implements AnalyzeAccuracyOutputBoundary {
  output: AnalyzeAccuracyOutputData | null = null;
  notFound: string | null = null;
  badRequest: { message: string; details?: ValidationIssue[] } | null = null;
  modelFailed = false;

  present(output: AnalyzeAccuracyOutputData): void {
    this.output = output;
  }

  presentBadRequest(message: string, details?: ValidationIssue[]): void {
    this.badRequest = { message, details };
  }

  presentNotFound(message: string): void {
    this.notFound = message;
  }

  presentServiceUnavailable(): void {
    throw new Error('Unexpected presentServiceUnavailable');
  }

  presentModelFailure(): void {
    this.modelFailed = true;
  }
}

/** Seeds one call and one branch; their transcripts are given by `messages`. */
async function setup(analyzer: AccuracyAnalyzer, content: string[] = ['Hello']) {
  const calls = new InMemoryCallRepository();
  const call = await calls.getCall('call-1001');

  const transcripts = new Map<string, InMemoryMessageRepository>();
  const messageRepoFactory = (_collection: string, parentId: string) => {
    let repo = transcripts.get(parentId);
    if (!repo) {
      repo = new InMemoryMessageRepository([]);
      transcripts.set(parentId, repo);
    }
    return repo;
  };

  const branches = new InMemoryBranchRepository(calls, messageRepoFactory);
  const accuracyRepo = new InMemoryAccuracyRepository();

  await messageRepoFactory('calls', call.id).addMessages(
    content.map((text, i) => ({
      role: 'agent',
      content: text,
      createdAt: new Date(Date.UTC(2026, 10, 4, 12, i)).toISOString(),
    })),
  );

  const interactor = new AnalyzeStoredAccuracyInteractor(
    analyzer,
    accuracyRepo,
    calls,
    branches,
    messageRepoFactory,
    () => NOW,
  );

  return { interactor, accuracyRepo, branches, messageRepoFactory, callId: call.id };
}

describe('AnalyzeStoredAccuracyInteractor', () => {
  it('analyzes a stored call and saves the result under its id', async () => {
    const { interactor, accuracyRepo, callId } = await setup({ analyze: async () => findings });
    const presenter = new RecordingPresenter();

    await interactor.handle({ id: callId, target: 'call' }, presenter);

    expect(presenter.output?.accuracy.analyzedAt).toBe(NOW.toISOString());
    expect(await accuracyRepo.getAccuracyForCall(callId)).toEqual(presenter.output?.accuracy);
  });

  it('presents not found for a call or branch that does not exist', async () => {
    const { interactor, accuracyRepo } = await setup({ analyze: async () => findings });

    const call = new RecordingPresenter();
    await interactor.handle({ id: 'nope', target: 'call' }, call);
    expect(call.notFound).toBe('Call with id nope not found.');

    const branch = new RecordingPresenter();
    await interactor.handle({ id: 'nope', target: 'branch' }, branch);
    expect(branch.notFound).toBe('Branch with id nope not found.');

    expect(await accuracyRepo.getAccuracyForCall('nope')).toBeNull();
  });

  it('rejects a stored transcript that is over the limits without calling the model', async () => {
    let analyzed = false;
    const { interactor, callId } = await setup(
      {
        analyze: async () => {
          analyzed = true;
          return findings;
        },
      },
      ['x'.repeat(MAX_MESSAGE_CHARS + 1)],
    );
    const presenter = new RecordingPresenter();

    await interactor.handle({ id: callId, target: 'call' }, presenter);

    expect(presenter.badRequest?.details?.[0]?.field).toBe('messages.0.content');
    expect(analyzed).toBe(false);
  });

  it('rejects a call that has no messages', async () => {
    const { interactor, callId } = await setup({ analyze: async () => findings }, []);
    const presenter = new RecordingPresenter();

    await interactor.handle({ id: callId, target: 'call' }, presenter);

    expect(presenter.badRequest?.details?.[0]?.message).toBe('At least one message is required.');
  });

  it('does not save when the model fails', async () => {
    const { interactor, accuracyRepo, callId } = await setup({
      analyze: async () => {
        throw new LlmOutputError('bad reply');
      },
    });
    const presenter = new RecordingPresenter();

    await interactor.handle({ id: callId, target: 'call' }, presenter);

    expect(presenter.modelFailed).toBe(true);
    expect(await accuracyRepo.getAccuracyForCall(callId)).toBeNull();
  });

  it('saves branch accuracy with the analyzed message IDs', async () => {
    const analyze = vi.fn<AccuracyAnalyzer['analyze']>().mockResolvedValue({
      ...findings,
      claims: [
        {
          messageIndex: 0,
          text: 'Saved context',
          verdict: 'unsupported',
          confidence: 1,
          explanation: 'No matching policy.',
          evidence: null,
        },
      ],
    });
    const { interactor, accuracyRepo, branches, messageRepoFactory, callId } = await setup(
      { analyze },
      ['Saved context', 'Original reply'],
    );
    const branchId = await branches.createBranchFromCall(callId, 1);
    const [message] = await messageRepoFactory('branches', branchId).getAllMessages();
    const presenter = new RecordingPresenter();

    await interactor.handle({ id: branchId, target: 'branch' }, presenter);

    expect(analyze).toHaveBeenCalledWith(
      [{ role: 'agent', content: 'Saved context' }],
      expect.any(String),
    );
    expect(presenter.output?.accuracy).toMatchObject({
      messageIds: [message!.id],
      claims: [{ messageId: message!.id }],
    });
    expect(await accuracyRepo.getAccuracyForCall(branchId)).toEqual(presenter.output?.accuracy);
  });
});
