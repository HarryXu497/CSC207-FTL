/**
 * This file defines emotion and sentiment types shared across the sentiment analysis pipeline (both on server and web)
 *
 * Defines the emotion label taxonomy (the 27 GoEmotions categories plus
 * "neutral" based on the GoEmotions dataset used in the sentiment models: https://research.google/blog/goemotions-a-dataset-for-fine-grained-emotion-classification/), a type guard for validating labels from model output, and the
 * result shapes returned by the emotion classifier and sentiment scorer.
 *
 * Exports:
 *  - isEmotionLabel(): runtime type guard for untrusted strings
 *  - Emotion:          a single labeled emotion with its confidence score
 *  - SentimentScore:   aggregate sentiment result for a piece of text
 */

//A list of the 28 supported GoEmotion categories that our pipeline will handle. Based on: https://research.google/blog/goemotions-a-dataset-for-fine-grained-emotion-classification/
export const EMOTION_LABELS = [
    'admiration',
    'amusement',
    'anger',
    'annoyance',
    'approval',
    'caring',
    'confusion',
    'curiosity',
    'desire',
    'disappointment',
    'disapproval',
    'disgust',
    'embarrassment',
    'excitement',
    'fear',
    'gratitude',
    'grief',
    'joy',
    'love',
    'nervousness',
    'optimism',
    'pride',
    'realization',
    'relief',
    'remorse',
    'sadness',
    'surprise',
    'neutral',
] as const;

//EmotionLabel is a union type of all the labels above.
export type EmotionLabel = (typeof EMOTION_LABELS)[number];

/**
 * Checks whether a given string is a valid emotion label.
 *
 * @param label - The string to assess.
 * @returns True if the label is a valid EmotionLabel; otherwise, false.
 */
export function isEmotionLabel(label: string): label is EmotionLabel {
  return (EMOTION_LABELS as readonly string[]).includes(label);
}

export interface Emotion {
  /**
   * An interface representing an Emotion and its corresponding score
   * 
   * Attributes:
   * -label: one of the 28 GoEmotion labels above
   * -score: a probability (confidence score) in range [0,1]
   */
  label: EmotionLabel;
  score: number;
}

export interface SentimentScore {
  /**
   * An interface representing a SentimentScore 
   * 
   * Attributes:
   * -valenceScore: overall valence: -1 (very negative) to 1 (very positive).
   * -intensity: how strongly the message is felt: 0 (flat) to 1 (intense).
   * -emotions: all emotions detected when making sentiment score, sorted by probability, highest first
   * -highConfidence: false for very short messages or when the two models disagree.
   * -ambiguity: how strongly an ambiguous emotion (surprise, confusion, ...) played a factor: 0 to 1.
   * -disagreement: How far the emotion model and the VAD model disagree: 0 (agree) to 1 (opposite).
   */
  score: number;
  intensity: number;
  emotions: Emotion[];
  highConfidence: boolean;
  ambiguity: number;
  disagreement: number;
}