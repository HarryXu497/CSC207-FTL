import type { Accuracy, Call } from 'src/entities';
import { LlmOutputError, NotFoundError } from 'src/errors';
import {
  FirestoreBranchRepository,
  FirestoreCallRepository,
  type AccuracyAnalyzer,
  type AccuracyRepository,
  type BranchRepository,
  type CallRepository,
  type MessageRepositoryBuilder,
} from 'src/repository';
import { analyzeTranscript, type AnalyzeAccuracyOutputBoundary } from '../AnalyzeAccuracy';
import { TARGET_LABELS } from '../target';
import type { AnalyzeStoredAccuracyInputBoundary, AnalyzeStoredAccuracyInputData } from './input';
import { validateTranscript } from './validateTranscript';

/**
 * Analyzes the stored transcript of a call or a branch and saves the result under its id. Calls and
 * branches share this use case; only the repository and message collection differ.
 */
export class AnalyzeStoredAccuracyInteractor implements AnalyzeStoredAccuracyInputBoundary {
  constructor(
    private readonly analyzer: AccuracyAnalyzer,
    private readonly accuracyRepo: AccuracyRepository,
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async handle(
    { id, target }: AnalyzeStoredAccuracyInputData,
    presenter: AnalyzeAccuracyOutputBoundary,
  ): Promise<void> {
    const label = TARGET_LABELS[target];
    let stored: Call;

    try {
      stored =
        target === 'call' ? await this.callRepo.getCall(id) : await this.branchRepo.getBranch(id);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`${label} with id ${id} not found.`);
        return;
      }

      throw e;
    }

    const collection =
      target === 'call' ? FirestoreCallRepository.COLLECTION : FirestoreBranchRepository.COLLECTION;
    const messages = await this.messageRepoFactory(collection, id).getAllMessages();
    const transcript = messages.map(({ role, content }) => ({ role, content }));

    const issues = validateTranscript(transcript);

    if (issues.length > 0) {
      presenter.presentBadRequest(`${label} ${id} cannot be analyzed.`, issues);
      return;
    }

    let accuracy: Accuracy;

    try {
      accuracy = await analyzeTranscript(this.analyzer, transcript, stored.topic, this.now);
    } catch (e) {
      if (e instanceof LlmOutputError) {
        presenter.presentModelFailure();
        return;
      }

      throw e;
    }

    await this.accuracyRepo.setAccuracy(id, accuracy);

    presenter.present({ accuracy });
  }
}
