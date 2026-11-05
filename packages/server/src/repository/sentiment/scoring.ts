/**
 * Scoring policy for sentiment analysis.
 *
 * functions used directly for scoreing only: no I/O and no models. Everything that is
 * tuned by hand (weights, thresholds) lives in ScoringConfig so it can be
 * changed in one place.
 */
import type { Emotion, EmotionLabel } from '@recall/shared';

/**
 * A mapping of each GoEmotions label to a valence value on a scale from -1 (very negative) to
 * 1 (very positive), where 0 is neutral. The valence scores come from the NRC-VAD Lexicon
 * (https://saifmohammad.com/WebPages/nrc-vad.html)
 *
 * This file uses this table to turn the emotion model's probabilities into
 * a single valence score. Each label's valence is weighted by the probability
 * the GoEmotions model assigned to that label, and the weighted values are
 * averaged. The result is an overall sentiment score for the message in the
 * range [-1, 1].
 *
 * Ambiguous emotions (see AMBIGUOUS_EMOTIONS) still have entries here, but
 * emotionValence skips them: their direction is unreliable, so the other
 * emotions decide the sign instead.
 */
export const EMOTION_VALENCE: Record<EmotionLabel, number> = {
  admiration: 0.938,
  amusement: 0.858,
  anger: -0.666,
  annoyance: -0.666,
  approval: 0.708,
  caring: 0.27,
  confusion: -0.49,
  curiosity: 0.5,
  desire: 0.792,
  disappointment: -0.77,
  disapproval: -0.83,
  disgust: -0.896,
  embarrassment: -0.714,
  excitement: 0.792,
  fear: -0.854,
  gratitude: 0.77,
  grief: -0.86,
  joy: 0.96,
  love: 0.996,
  nervousness: -0.674,
  optimism: 0.898,
  pride: 0.458,
  realization: 0.108,
  relief: 0.688,
  remorse: -0.794,
  sadness: -0.896,
  surprise: 0.75,
  neutral: 0,
};

/**
 * This is the set of emotions that are ambigous based on the GoEmotions publication (https://research.google/blog/goemotions-a-dataset-for-fine-grained-emotion-classification/)
 * This list makes intuitive sense. For instance, suprise could be both good and bad.
 */
export const AMBIGUOUS_EMOTIONS: ReadonlySet<EmotionLabel> = new Set<EmotionLabel>([
  'realization',
  'surprise',
  'curiosity',
  'confusion',
]);

/**
 * An interface that stores every hand-tuned number used by the sentiment scoring, in one place.
 * The functions in this file read their weights and thresholds from this this object.
 *
 * NOTE: Most of these values are heuristics (based on some rough tests on some chats), not measured results.
 *
 * Attributes:
 * -wEmotion: share (weight) of the final valence taken from the GoEmotion model (0 to 1)
 * -wVad: share (weight) of the final valence taken from the VAD model (0 to 1). wVad + wEmotion should sum to 1
 * -minDirectionalProbability: an emotion counts as a directional signal only at or above this probability.
 * -normalizerFloor: floor for the valence normalizer. See its use for more context.
 * -intensityValenceWeight: share of intensity taken from |valence|; the rest comes from arousal.
 * -minWordsForConfidence: messages with this many words or fewer are never high confidence. ex. "ok" can't convey much emotion
 * -disagreementThreshold: disagreement at or above this makes a result low confidence.
 * -maxWordsSingleFragment: messages with more words than this are split into sentences and scored per fragment.
 * -neutralFloor: added to |valence| so neutral sentences still get a little weight when merging fragments
 */
export interface ScoringConfig {
  readonly wEmotion: number;
  readonly wVad: number;
  readonly minDirectionalProbability: number;
  readonly normalizerFloor: number;
  readonly intensityValenceWeight: number;
  readonly minWordsForConfidence: number;
  readonly disagreementThreshold: number;
  readonly maxWordsSingleFragment: number;
  readonly neutralFloor: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  wEmotion: 0.5,
  wVad: 0.5,
  minDirectionalProbability: 0.2,
  normalizerFloor: 1,
  intensityValenceWeight: 0.5,
  minWordsForConfidence: 3,
  disagreementThreshold: 0.5,
  maxWordsSingleFragment: 25,
  neutralFloor: 0.1,
};

/**
 * Counts whitespace-seperated words to determine word count.
 * @param text - text being assessed for word count
 * @returns the word count, or 0 for empty/whitespace only text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Determines valence score from the emotion model's findings alone.
 * Probability-weighted average of the lexicon valences, skipping ambiguous
 * emotions so the remaining emotions decide the direction.
 *
 * @param emotions - Emotion probabilities from the classifier.
 * @param config - Uses normalizerFloor.
 * @returns a valence score in range [-1,1]
 */
export function emotionValence(
  emotions: readonly Emotion[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { label, score } of emotions) {
    if (AMBIGUOUS_EMOTIONS.has(label)) {
      continue;
    }
    weightedSum += EMOTION_VALENCE[label] * score;
    totalWeight += score;
  }

  //NOTE: config.normalizerFloor prevents division by a very small number from inflating the score.
  //However, it also changes the score's scale: when the total probability is below 1, the result will
  //no longer be a normalized weighted average. This is a deilberate design choice.
  return weightedSum / Math.max(totalWeight, config.normalizerFloor);
}

/**
 * Determines wether there is a clear emotional signal found in a message.
 *
 * @param emotions - Emotion probabilities from the classifier.
 * @param config - Uses minDirectionalProbability.
 * @returns True if at least one non-ambiguous, non-neutral emotion is strong enough to give a direction.
 */
export function hasDirectionalSignal(
  emotions: readonly Emotion[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): boolean {
  return emotions.some(
    ({ label, score }) =>
      !AMBIGUOUS_EMOTIONS.has(label) &&
      label !== 'neutral' &&
      score >= config.minDirectionalProbability,
  );
}

/**
 * determines how ambigous a message is based on how high the confidence score was for an ambigous emotion.
 * @param emotions- Emotion probabilities from the classifier.
 * @returns - the highest ambiguous probability, 0 to 1 (0 if none).
 */
export function ambiguityScore(emotions: readonly Emotion[]): number {
  let max = 0;
  for (const { label, score } of emotions) {
    if (AMBIGUOUS_EMOTIONS.has(label)) max = Math.max(max, score);
  }
  return max;
}

/**
 * An interface that stores the final valence score after the valence scores from each model are fused
 *
 * Attributes:
 * -valence: final valence score in [-1, 1]
 * -disagreement: a  score in range [0,1]. 0 = the two models agree, 1 = they completely disagree.
 */
export interface FusedValence {
  valence: number;
  disagreement: number;
}

/**
 * Combines the emotion model's valence with the VAD model's valence into one final valence, and measures how much the two models disagree.
 *
 * If the emotion model found no directional signal (for example, only
 * ambigous emotions had high prob.), it has no score to contribute. The VAD valence is then
 * used alone, and disagreement is reported as 0, because there is nothing for
 * the two models to disagree about.
 *
 * @param emotionVal - Valence from the emotion model, in [-1, 1].
 * @param vadVal - Valence from the VAD model, in [-1, 1].
 * @param hasDirection - Whether the emotion model gave a usable direction.
 * @param config - Supplies the two model weights.
 * @returns A single valence score in [-1, 1] (assuming the weights sum to 1) and disagreement
 *  in [0, 1], where 0 means the models agree and 1 means they are at opposite extremes.
 */
export function fuseValence(
  emotionVal: number,
  vadVal: number,
  hasDirection: boolean,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): FusedValence {
  if (!hasDirection) return { valence: vadVal, disagreement: 0 };

  return {
    valence: config.wEmotion * emotionVal + config.wVad * vadVal,
    disagreement: Math.abs(emotionVal - vadVal) / 2,
  };
}

/**
 * Determines how strongly a message is felt, from 0 (flat) to 1 (intense).
 *
 * Valence says whether the text is positive or negative, not how strongly it
 * is felt, so it is blended with arousal (how energetic the text sounds).
 * Only the size of the valence matters here (its absolute value): very angry
 * and very happy both count as intense. The blend ratio is
 * config.intensityValenceWeight, and it is a heuristic.
 *
 * @param valence - Overall valence, in [-1, 1].
 * @param arousal - Arousal from the VAD model, in [0, 1].
 * @param config - Supplies the blend weight.
 * @returns Intensity in [0, 1].
 */
export function intensity(
  valence: number,
  arousal: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  const w = config.intensityValenceWeight;
  return Math.min(1, w * Math.abs(valence) + (1 - w) * arousal);
}

/**
 * Determines whether a result is high confidence
 *
 * A result is high confidence only if the message is long enough to carry
 * a clear emotion (more than minWordsForConfidence words), and the two models do not strongly
 * disagree (disagreement below disagreementThreshold).
 *
 * @param wordCount - Number of words in the message being scored.
 * @param disagreement - How far the two models disagree, in [0, 1]
 * @param config - Supplies the thresholds.
 * @returns true if both conditions hold, otherwise false.
 */
export function isHighConfidence(
  wordCount: number,
  disagreement: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): boolean {
  return wordCount > config.minWordsForConfidence && disagreement < config.disagreementThreshold;
}

/**
 * Splits a message into sentence fragments, so a long message can be scored
 * one sentence at a time.
 *
 * Splits after each ".", "!" or "?" and keeps the punctuation with its
 * sentence. Each fragment is trimmed, and empty ones are dropped.
 *
 * @param message - The full message text.
 * @returns The sentence fragments in their original order. Empty if the message has no text.
 */
export function splitChatMessage(message: string): string[] {
  const sentences = message.match(/[^.!?]+[.!?]*/g) ?? [];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

/**
 * Computes how much each sentence counts when fragments are merged.
 *
 * The weight is the size of the fragment's valence plus config.neutralFloor,
 * so strongly felt sentences count more, while flat sentences still count a
 * little instead of being ignored.
 *
 * @param valences - One valence per fragment, each in [-1, 1].
 * @param config - Supplies the neutral floor.
 * @returns One weight per fragment, in the same order.
 */
export function fragmentWeights(
  valences: readonly number[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number[] {
  return valences.map((valence) => Math.abs(valence) + config.neutralFloor);
}

/**
 * Weighted average of values across fragments. It does this in a way so the strongly felt fragments
 * contribute more to the result. This is because in a longer message, the strong feelings will stick with customer/agent more
 *
 * Used for valence, and also works for any per-fragment number (such as
 * arousal) when given the same weights.
 *
 * @param valences - One value per fragment (for valence, each in [-1, 1]).
 * @param weights - One weight per fragment, in the same order.
 * @returns The weighted average. Returns 0 if the total weight is 0, to avoid dividing by zero.
 */
export function extremityWeighted(valences: readonly number[], weights: readonly number[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < valences.length; i++) {
    weightedSum += (valences[i] ?? 0) * (weights[i] ?? 0);
    totalWeight += weights[i] ?? 0;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Merges the emotion probabilities from all fragments into one list, so you
 * can see which emotions showed up across the whole message.
 *
 * For each emotion, takes its probability in every fragment, multiplies each
 * by that fragment's share of the total weight, and sums them. This is a
 * weighted average. The merged scores are still independent
 * probabilities in [0, 1] and do not add up to 1.
 *
 * How the weights affect the result:
 *  - The weight belongs to the sentence, not the emotion. It comes from the
 *    sentence's overall valence (see from fragmentWeights), so every emotion
 *    in an intense sentence counts for more than the same probability in a flat
 *    one. This reflects my design assumption that strongly felt moments are
 *    the ones that stay with agents and customers.
 *
 * This list is for display only. The overall valence score is not computed from
 * it; it comes from the per-sentence valences through extremityWeighted.
 *
 * @param emotionsPerFragment - One emotion list per fragment, in the same order as weights
 * @param weights - One weight per fragment.
 * @returns One entry per emotion that appeared, sorted by score, highest first.
 */
export function mergeEmotions(
  emotionsPerFragment: readonly (readonly Emotion[])[],
  weights: readonly number[],
): Emotion[] {
  let totalWeight = 0;
  for (const weight of weights) totalWeight += weight;
  if (totalWeight === 0) return [];

  const merged = new Map<EmotionLabel, number>();
  for (let i = 0; i < emotionsPerFragment.length; i++) {
    for (const { label, score } of emotionsPerFragment[i] ?? []) {
      merged.set(label, (merged.get(label) ?? 0) + (score * (weights[i] ?? 0)) / totalWeight);
    }
  }

  return [...merged]
    .map(([label, score]): Emotion => ({ label, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Finds the highest probability each emotion reached in any single fragment.
 *
 * Unlike mergeEmotions, this does not average, so one strongly
 * emotional sentence is not diluted by the neutral ones around it. Used for
 * judging direction and ambiguity.
 *
 * @param emotionsPerFragment - One emotion list per fragment.
 * @returns One entry per emotion that appeared, with its peak score. Not sorted.
 */
export function peakEmotions(emotionsPerFragment: readonly (readonly Emotion[])[]): Emotion[] {
  const best = new Map<EmotionLabel, number>();
  for (const emotions of emotionsPerFragment) {
    for (const { label, score } of emotions) {
      best.set(label, Math.max(best.get(label) ?? 0, score));
    }
  }
  return [...best].map(([label, score]): Emotion => ({ label, score }));
}
