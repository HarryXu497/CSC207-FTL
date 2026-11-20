import { computeScore, countVerdicts, type AccuracyFindings, type Accuracy } from 'src/entities';
import { LlmOutputError } from 'src/errors';
import type { AccuracyAnalyzer, AccuracyRepository } from 'src/repository';
import type { AnalyzeAccuracyInputBoundary, AnalyzeAccuracyInputData } from './input';
import type { AnalyzeAccuracyOutputBoundary } from './output';

export class AnalyzeAccuracyInteractor implements AnalyzeAccuracyInputBoundary {
  constructor(
    private readonly analyzer: AccuracyAnalyzer,
    private readonly repo: AccuracyRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async handle(
    { callId, messages, topic }: AnalyzeAccuracyInputData,
    presenter: AnalyzeAccuracyOutputBoundary,
  ): Promise<void> {
    let findings: AccuracyFindings;

    try {
      findings = await this.analyzer.analyze(messages, topic);
    } catch (e) {
      if (e instanceof LlmOutputError) {
        presenter.presentModelFailure();
        return;
      }

      throw e;
    }

    const requiredSources = new Set(findings.documents.required.map((d) => d.source));

    const accuracy: Accuracy = {
      score: computeScore(findings.claims, requiredSources),
      counts: countVerdicts(findings.claims),
      ...findings,
      analyzedAt: this.now().toISOString(),
    };

    if (callId !== undefined) {
      await this.repo.setAccuracy(callId, accuracy);
    }

    presenter.present({ accuracy });
  }
}
