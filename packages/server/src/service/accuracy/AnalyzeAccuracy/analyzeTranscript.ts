import { computeScore, countVerdicts, type Accuracy, type TranscriptMessage } from 'src/entities';
import type { AccuracyAnalyzer } from 'src/repository';

/**
 * Runs the analyzer over a transcript and scores its findings.
 * @throws LlmOutputError when the model keeps returning unusable output
 */
export async function analyzeTranscript(
  analyzer: AccuracyAnalyzer,
  messages: TranscriptMessage[],
  topic: string | undefined,
  now: () => Date,
): Promise<Accuracy> {
  const findings = await analyzer.analyze(messages, topic);
  const requiredSources = new Set(findings.documents.required.map((d) => d.source));

  return {
    score: computeScore(findings.claims, requiredSources),
    counts: countVerdicts(findings.claims),
    ...findings,
    analyzedAt: now().toISOString(),
  };
}
