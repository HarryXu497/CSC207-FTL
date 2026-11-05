/**
 * Use case: analyse the sentiment of a list of messages.
 *
 * Depends only on the two model interfaces and the pure scoring functions.
 * It does not know which models are behind the interfaces, and it has no
 * HTTP or Express code.
 */
import type { Emotion, SentimentScore } from '@recall/shared';
import type { EmotionClassifier, VadEstimator } from 'src/repository/sentiment/SentimentModels';
import {
  DEFAULT_SCORING_CONFIG,
  ambiguityScore,
  countWords,
  emotionValence,
  extremityWeighted,
  fragmentWeights,
  fuseValence,
  hasDirectionalSignal,
  intensity,
  isHighConfidence,
  mergeEmotions,
  peakEmotions,
  splitChatMessage,
  type ScoringConfig,
} from './scoring';

/** Longest message accepted, in characters. Protects the models from huge inputs. */
const MAX_MESSAGE_CHARS = 5000;

export interface AnalyseMessagesInput {
  /** Unknown on purpose: this is where untrusted input is checked at runtime. */
  messages: unknown[];
}

export type MessageFailureReason = 'empty' | 'not_a_string' | 'too_long';

/** One result per input message, in the same order. */
export type MessageResult =
  | { ok: true; sentiment: SentimentScore }
  | { ok: false; reason: MessageFailureReason };

/** Everything computed for one piece of text, before it becomes a SentimentScore. */
interface FragmentAnalysis {
  emotions: Emotion[];
  valence: number;
  arousal: number;
  disagreement: number;
}

export class AnalyseMessages {
  constructor(
    private readonly emotionClassifier: EmotionClassifier,
    private readonly vadEstimator: VadEstimator,
    private readonly config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  ) {}

  /**
   * Analyses each message independently. A bad message produces an
   * `ok: false` entry and does not stop the rest of the batch.
   *
   * Messages run one at a time to keep memory use predictable.
   *
   * @throws If a model fails. That is an infrastructure error, not bad input,
   * so it rejects the whole call instead of being reported per message.
   */
  async handle(input: AnalyseMessagesInput): Promise<MessageResult[]> {
    const results: MessageResult[] = [];
    for (const message of input.messages) {
      results.push(await this.analyseOne(message));
    }
    return results;
  }

  private async analyseOne(message: unknown): Promise<MessageResult> {
    if (typeof message !== 'string') return { ok: false, reason: 'not_a_string' };

    const text = message.trim();
    if (text.length === 0) return { ok: false, reason: 'empty' };
    if (text.length > MAX_MESSAGE_CHARS) return { ok: false, reason: 'too_long' };

    const wordCount = countWords(text);
    const sentiment =
      wordCount <= this.config.maxWordsSingleFragment
        ? await this.analyseShort(text, wordCount)
        : await this.analyseLong(text, wordCount);

    return { ok: true, sentiment };
  }
  /** Runs both models on one piece of text and fuses their valence. */
  private async analyseFragment(text: string): Promise<FragmentAnalysis> {
    const [rawEmotions, vad] = await Promise.all([
      this.emotionClassifier.classify(text),
      this.vadEstimator.estimate(text),
    ]);
    // Sort here so nothing depends on the order the library happens to return.
    const emotions = [...rawEmotions].sort((a, b) => b.score - a.score);

    const { valence, disagreement } = fuseValence(
      emotionValence(emotions, this.config),
      vad.valence,
      hasDirectionalSignal(emotions, this.config),
      this.config,
    );
    return { emotions, valence, arousal: vad.arousal, disagreement };
  }

  private async analyseShort(text: string, wordCount: number): Promise<SentimentScore> {
    const f = await this.analyseFragment(text);
    return {
      score: f.valence,
      intensity: intensity(f.valence, f.arousal, this.config),
      emotions: f.emotions,
      highConfidence: isHighConfidence(wordCount, f.disagreement, this.config),
      ambiguity: ambiguityScore(f.emotions),
      disagreement: f.disagreement,
    };
  }

  /** Splits into sentences, scores each, then merges. Falls back to short if nothing splits. */
  private async analyseLong(text: string, wordCount: number): Promise<SentimentScore> {
    const pieces = splitChatMessage(text);
    if (pieces.length === 0) return this.analyseShort(text, wordCount); // e.g. only punctuation

    const fragments: FragmentAnalysis[] = [];
    for (const piece of pieces) {
      fragments.push(await this.analyseFragment(piece)); // sequential: each call runs two models
    }

    const valences = fragments.map((f) => f.valence);
    const weights = fragmentWeights(valences, this.config);
    const perFragment = fragments.map((f) => f.emotions);
    const peak = peakEmotions(perFragment);

    const score = extremityWeighted(valences, weights);
    // extremityWeighted is just a weighted mean, so it works for arousal too.
    const arousal = extremityWeighted(
      fragments.map((f) => f.arousal),
      weights,
    );
    // Worst case, so one sarcastic sentence still lowers confidence for the whole message.
    const disagreement = Math.max(...fragments.map((f) => f.disagreement));

    return {
      score,
      intensity: intensity(score, arousal, this.config),
      emotions: mergeEmotions(perFragment, weights),
      highConfidence: isHighConfidence(wordCount, disagreement, this.config),
      ambiguity: ambiguityScore(peak), // peak, not merged, so one strong sentence isn't diluted
      disagreement,
    };
  }
}