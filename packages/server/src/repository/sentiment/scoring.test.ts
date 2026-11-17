/**
 * Test File for the functions in scoring.ts
 *
 * IMPORTANT: use "npx vitest run scoring.test.ts" to run tests
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCORING_CONFIG,
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
import { EMOTION_LABELS, type Emotion, type EmotionLabel } from 'src/entities';

const CONFIG: ScoringConfig = DEFAULT_SCORING_CONFIG;

/**
 * This function is a test helper. It builds a full emotion list the way the classifier would return it.
 *
 * Every one of the 28 labels is included exactly once. Labels given in scores
 * get that probability; all others default to 0. This lets each test specify
 * only the emotions it cares about, e.g. emotionsWith({ joy: 0.5 }).
 *
 * @param scores - Probabilities for the labels to set, each in [0, 1].
 * @returns One Emotion per label, in EMOTION_LABELS order (not sorted by score).
 */
function emotionsWith(scores: Partial<Record<EmotionLabel, number>>): Emotion[] {
  return EMOTION_LABELS.map((label) => ({ label, score: scores[label] ?? 0 }));
}

/**
 * This function is a test helper. It looks up the score of one emotion in a list.
 *
 * @param list - The emotion list to search.
 * @param label - The emotion whose score is wanted.
 * @returns The score
 */
const scoreOf = (list: Emotion[], label: EmotionLabel) =>
  list.find((e) => e.label === label)?.score;

//FOR THE BELOW: refer to the test titles for documentation for each test

describe('emotionValence', () => {
  it('should average NRC valences by probability and skips ambiguous emotions', () => {
    expect(emotionValence(emotionsWith({ joy: 1 }), CONFIG)).toBeCloseTo(0.96);
    expect(emotionValence(emotionsWith({ surprise: 0.9 }), CONFIG)).toBe(0); //since suprise is ambigous
    expect(emotionValence(emotionsWith({ joy: 0.5, sadness: 0.5 }), CONFIG)).toBeCloseTo(0.032);
  });

  it('should shrink weak signals toward 0 due to normalizer floor', () => {
    expect(emotionValence(emotionsWith({ joy: 0.5 }), CONFIG)).toBeCloseTo(0.48);
  });
});

describe('hasDirectionalSignal', () => {
  it('should need a non-neutral, non-ambiguous emotion at or above the threshold to have directional signal', () => {
    expect(hasDirectionalSignal(emotionsWith({ joy: 0.2 }), CONFIG)).toBe(true);
    expect(hasDirectionalSignal(emotionsWith({ joy: 0.19 }), CONFIG)).toBe(false);
    expect(hasDirectionalSignal(emotionsWith({ neutral: 0.99 }), CONFIG)).toBe(false);
    expect(hasDirectionalSignal(emotionsWith({ surprise: 0.99 }), CONFIG)).toBe(false);
  });
});

describe('fuseValence', () => {
  it('should uses the VAD valence alone, with 0 disagreement, when there is no direction', () => {
    expect(fuseValence(0.9, -0.4, false, CONFIG)).toEqual({ valence: -0.4, disagreement: 0 });
  });

  it('should report full disagreement at opposite extremes', () => {
    const result = fuseValence(1, -1, true, CONFIG);
    expect(result.valence).toBeCloseTo(0);
    expect(result.disagreement).toBeCloseTo(1);
  });
});

describe('intensity', () => {
  it('should ignore the sign of valence and is capped at 1', () => {
    expect(intensity(-0.8, 0.2, CONFIG)).toBeCloseTo(0.5);
    expect(intensity(0.8, 0.2, CONFIG)).toBeCloseTo(0.5);
    expect(intensity(5, 5, CONFIG)).toBe(1);
  });
});

describe('isHighConfidence', () => {
  it('should need more than the minimum words and disagreement strictly below the threshold to be confident', () => {
    expect(isHighConfidence(3, 0, CONFIG)).toBe(false);
    expect(isHighConfidence(4, 0, CONFIG)).toBe(true);
    expect(isHighConfidence(10, 0.49, CONFIG)).toBe(true);
    expect(isHighConfidence(10, 0.5, CONFIG)).toBe(false);
  });
});

describe('splitChatMessage', () => {
  it('should split after . ! ? and should handles text with no punctuation or no text', () => {
    expect(splitChatMessage('Hello there. How are you? Fine!')).toEqual([
      'Hello there.',
      'How are you?',
      'Fine!',
    ]);
    expect(splitChatMessage('just one thing')).toEqual(['just one thing']);
    expect(splitChatMessage('   ')).toEqual([]);
  });
});

describe('extremityWeighted', () => {
  it('should let strongly felt fragments have more weight and handle empty input', () => {
    const valences = [-0.8, -0.1, -0.1, 0.5];
    expect(extremityWeighted(valences, fragmentWeights(valences, CONFIG))).toBeCloseTo(-0.242, 3);
    expect(extremityWeighted([], [])).toBe(0);
  });
});

describe('mergeEmotions', () => {
  it('should compute a weighted average per emotion', () => {
    const merged = mergeEmotions(
      [emotionsWith({ anger: 0.9 }), emotionsWith({ anger: 0.1, joy: 0.8 })],
      [0.9, 0.2],
    );
    expect(scoreOf(merged, 'anger')).toBeCloseTo(0.7545, 3);
    expect(scoreOf(merged, 'joy')).toBeCloseTo(0.1455, 3);
  });
});

describe('peakEmotions', () => {
  it('should keep the highest probability each emotion reached in any fragment', () => {
    const peak = peakEmotions([
      emotionsWith({ anger: 0.2 }),
      emotionsWith({ anger: 0.9, joy: 0.4 }),
    ]);
    expect(scoreOf(peak, 'anger')).toBe(0.9);
    expect(scoreOf(peak, 'joy')).toBe(0.4);
  });
});
