/**
 * File contains the main use case: in which I analyse the sentiment of a list of messages.
 *
 * Depends only on the two model interfaces and the pure scoring functions.
 * It does not know which models are behind the interfaces. Contains the AnalyseMessage function which
 * will be used to analyse all messages. I expect files wanting to access sentiment scoring to use AnalyseMessage.
 */
import type { Emotion, SentimentScore } from '@recall/shared';
import type { EmotionClassifier, VadEstimator } from 'src/repository';
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

/**
 * Input accepted by the AnalyseMessages use case.
 */
export interface AnalyseMessagesInput {
  /**
   * The messages to analyse.
   */
  messages: unknown[];
}

/**
 * Type for why a single message could not be analysed.
 * - 'empty' corresponds to the message was blank after trimming whitespace
 * - 'not_a_string'corresponds to the message was not a string
 * - 'too_long' corresponds to the message exceeded max limit of 5000 charectors
 */
export type MessageFailureReason = 'empty' | 'not_a_string' | 'too_long';

/**
 * A type that represents the outcome of analysing one message: either a sentiment score, or a reason it failed.
 * Branches on `ok`.
 */
export type MessageResult =
  { ok: true; sentiment: SentimentScore } | { ok: false; reason: MessageFailureReason };

/**
 * An interface for the Intermediate result of analysing just one fragment (ex. a whole short message, or one piece of a long one).
 * Internal to this file as its combined into a SentimentScore afterwards.
 */
interface FragmentAnalysis {
  // Emotions detected in the fragment, sorted by score in descending order
  emotions: Emotion[];
  // Fused valence of the fragment (emotion-derived and VAD-derived signals combined)
  valence: number;
  // Arousal of the fragment, taken directly from the VAD estimator
  arousal: number;
  // How much the emotion classifier and the VAD estimator disagree on valence
  disagreement: number;
}

/**
 * Use case that analyses the sentiment of a list of chat messages.
 * Short messages are scored as a single fragment; long messages are split into
 * multiple fragments, scored individually, and aggregated.
 */
export class AnalyseMessages {
  // Model that classifies text into emotion labels with scores
  private readonly emotionClassifier: EmotionClassifier;
  // Model that estimates valence and arousal (VAD) of text
  private readonly vadEstimator: VadEstimator;
  // Scoring thresholds and weights, defaults to DEFAULT_SCORING_CONFIG
  private readonly config: ScoringConfig = DEFAULT_SCORING_CONFIG;

  constructor(
    emotionClassifier: EmotionClassifier,
    vadEstimator: VadEstimator,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  ) {
    this.emotionClassifier = emotionClassifier;
    this.vadEstimator = vadEstimator;
    this.config = config;
  }

  /**
   * Analyses every message in the input.
   * Messages are processed concurrently
   * @param input - The messages to analyse
   * @returns one result per message, in the same order as the input
   */
  async handle(input: AnalyseMessagesInput): Promise<MessageResult[]> {
    // Promise.all should preserve input order regardless of which message finishes first
    return Promise.all(input.messages.map((message) => this.analyseOne(message)));
  }

  /**
   * Validates one message and sets it to the short or long analysis path.
   * Invalid input is returned as a failed result rather than thrown, so one bad
   * message does not affect the whole batch.
   * @param message - The raw message
   * @returns a successful result with the sentiment, or a failed result with the reason
   */
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

  /**
   * Runs both models on one piece of text and fuses their valence estimates.
   * @param text - The fragment to analyse, already validated
   * @returns the emotions, fused valence, arousal and model disagreement for the fragment
   */
  private async analyseFragment(text: string): Promise<FragmentAnalysis> {
    const [rawEmotions, vad] = await Promise.all([
      this.emotionClassifier.classify(text),
      this.vadEstimator.estimate(text),
    ]);
    const emotions = [...rawEmotions].sort((a, b) => b.score - a.score);

    const { valence, disagreement } = fuseValence(
      emotionValence(emotions, this.config),
      vad.valence,
      hasDirectionalSignal(emotions, this.config),
      this.config,
    );
    return { emotions, valence, arousal: vad.arousal, disagreement };
  }

  /**
   * Scores a short message as a single fragment.
   * @param text - The message text, already validated
   * @param wordCount - Number of words in the text, used for the confidence check
   * @returns the sentiment score for the message
   */
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

  /**
   * Scores a long message by splitting it into fragments, analysing each,
   * and aggregating with weights that favour the more extreme fragments.
   * @param text - The message text, already validated
   * @param wordCount - Number of words in the whole text, used for the confidence check
   * @returns the aggregated sentiment score for the message
   */
  private async analyseLong(text: string, wordCount: number): Promise<SentimentScore> {
    const pieces = splitChatMessage(text);
    //this is a case to check what if its only punctuation (i.e !!!)
    if (pieces.length === 0) return this.analyseShort(text, wordCount);

    // Fragments are independent, so analyse them concurrently; Promise.all preserves piece order
    const fragments: FragmentAnalysis[] = await Promise.all(
      pieces.map((piece) => this.analyseFragment(piece)),
    );

    const valences = fragments.map((f) => f.valence);
    const weights = fragmentWeights(valences, this.config);
    const perFragment = fragments.map((f) => f.emotions);
    const peak = peakEmotions(perFragment);

    // ExtreamityWegihted so that more extream emotions influence score more
    const score = extremityWeighted(valences, weights);

    // extremityWeighted is just a weighted mean, so it works for arousal too.
    const arousal = extremityWeighted(
      fragments.map((f) => f.arousal),
      weights,
    );

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
