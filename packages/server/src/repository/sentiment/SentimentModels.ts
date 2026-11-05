/**
 * Contracts for the two models the sentiment service depends on.
 * The service imports these interfaces only, never the Transformers classes to ensure Clean Architecture. 
 */
import type { Emotion } from '@recall/shared';

/**
 * An interface that depicts the result of the VAD model
 * 
 * Attributes:
 * -valence: how positive or negative the text sounds, from -1 (very negative) to 1 (very positive)
 * -arousal: how energetic or calm the text sounds, from 0 (calm) to 1 (energetic)
 * -dominance: how in-control the text sounds, from 0 (powerless) to 1 (in control)
 */
export interface Vad {
  valence: number;
  arousal: number;
  dominance: number;
}

/**
 * The contract for the emotion classifer model the sentiment service can use.
 * 
 * Currently GoEmotionsClassifier implements it, but another model (or a fake, in tests) can replace
 * it without changing the rest of the code, as long as it follows the contract below.
 */
export interface EmotionClassifier {

   /**
   * Scores a piece of text against every emotion label.
   *
   * @param text - The text to classify. Must be non-empty; the caller validates this.
   * @returns One Emotion per label.
   */
  classify(text: string): Promise<Emotion[]>;
}

/**
 * The contract for any VAD (valence, arousal, dominance) model the sentiment service can use.
 */
export interface VadEstimator {

  /**
   * Estimates how positive, energetic and in-control a piece of text sounds.
   *
   * @param text - The text to analyse. Must be non-empty; the caller validates this.
   * @returns A Vad with each attribute in its stated range.
   */
  estimate(text: string): Promise<Vad>;
}