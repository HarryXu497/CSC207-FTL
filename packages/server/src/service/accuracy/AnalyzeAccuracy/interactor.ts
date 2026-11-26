import type { Accuracy } from 'src/entities';
import { LlmOutputError } from 'src/errors';
import type { AccuracyAnalyzer } from 'src/repository';
import { analyzeTranscript } from './analyzeTranscript';
import type { AnalyzeAccuracyInputBoundary, AnalyzeAccuracyInputData } from './input';
import type { AnalyzeAccuracyOutputBoundary } from './output';

/** Analyzes a transcript that was sent in the request. Nothing is stored. */
export class AnalyzeAccuracyInteractor implements AnalyzeAccuracyInputBoundary {
  constructor(
    private readonly analyzer: AccuracyAnalyzer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async handle(
    { messages, topic }: AnalyzeAccuracyInputData,
    presenter: AnalyzeAccuracyOutputBoundary,
  ): Promise<void> {
    let accuracy: Accuracy;

    try {
      accuracy = await analyzeTranscript(this.analyzer, messages, topic, this.now);
    } catch (e) {
      if (e instanceof LlmOutputError) {
        presenter.presentModelFailure();
        return;
      }

      throw e;
    }

    presenter.present({ accuracy });
  }
}
