/**
 * Test File for the class in AnalyseMessages.ts
 * 
 * IMPORTANT: npx vitest run AnalyseMessages.test.ts
 */
//TODO: add comments over tests

import { EMOTION_LABELS, type Emotion, type EmotionLabel, type SentimentScore } from '@recall/shared';
import type { EmotionClassifier, Vad, VadEstimator } from 'src/repository/sentiment/SentimentModels';
import { describe, expect, it } from 'vitest';
import { AnalyseMessages, type MessageResult } from './AnalyseMessages';
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from './scoring';

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
 * Fake for the emotion model, so AnalyseMessages can be tested without loading GoEmotions.
 *
 * Returns whatever the respond function gives for the input text. By default every text is
 * 100% neutral. It also records each text it was asked to classify, so tests can check
 * how a message was split into fragments.
 *
 * Attributes:
 * -calls: every text passed to classify(), in call order
 * -respond: builds the emotion list for a given text (default: neutral = 1)
 */
class FakeEmotionClassifier implements EmotionClassifier {
  readonly calls: string[] = [];
  private readonly respond: (text: string) => Emotion[];

  constructor(respond: (text: string) => Emotion[] = () => emotionsWith({ neutral: 1 })) {
    this.respond = respond;
  }

  async classify(text: string): Promise<Emotion[]> {
    this.calls.push(text);
    return this.respond(text);
  }
}

/**
 * Fake for the VAD model, so AnalyseMessages can be tested without loading vad-bert.
 *
 * Returns whatever the respond function gives for the input text. By default every text
 * gets valence 0, arousal 0.5 and dominance 0.5. Unlike the fake classifier, it does not
 * record calls.
 *
 * Attributes:
 * -respond: builds the Vad for a given text (default: { valence: 0, arousal: 0.5, dominance: 0.5 })
 */
class FakeVadEstimator implements VadEstimator {
  private readonly respond: (text: string) => Vad;

  constructor(respond: (text: string) => Vad = () => ({ valence: 0, arousal: 0.5, dominance: 0.5 })) {
    this.respond = respond;
  }

  async estimate(text: string): Promise<Vad> {
    return this.respond(text);
  }
}

/**
 * This is a Test helper function and it builds an AnalyseMessages wired to the fake models and the pinned CONFIG.
 *
 * Pass a responder to control what a model returns for a given text; leave it out to keep
 * the defaults (neutral emotions, flat VAD).
 *
 * @param respondEmotions - Optional function giving the fake classifier's emotions for a text.
 * @param respondVad - Optional function giving the fake VAD estimator's output for a text.
 * @returns The use case as analyse, and the fake classifier so tests can inspect its recorded calls.
 */
function build(respondEmotions?: (t: string) => Emotion[], respondVad?: (t: string) => Vad) {
  const classifier = new FakeEmotionClassifier(respondEmotions);
  return { classifier, analyse: new AnalyseMessages(classifier, new FakeVadEstimator(respondVad), CONFIG) };
}

/**
 * This is a Test helper function and it pulls the SentimentScore out of a MessageResult.
 *
 * Lets tests read the score directly instead of narrowing the ok union each time.
 *
 * @param result - One entry from AnalyseMessages.handle().
 * @returns The sentiment score of the result.
 * @throws If the result is missing or is an `ok: false` failure, which fails the test.
 */
function sentimentOf(result: MessageResult | undefined): SentimentScore {
  if (!result?.ok) throw new Error('expected an ok result');
  return result.sentiment;
}

//FOR THE BELOW: refer to the test titles for documentation for each test

describe('AnalyseMessages: validation', () => {
  it('should report bad items per message, keep order, and never sends them to a model', async () => {
    const { analyse, classifier } = build(
      (text) => (text.includes('happy') ? emotionsWith({ joy: 1 }) : emotionsWith({ anger: 1 })),
      (text) => ({ valence: text.includes('happy') ? 0.96 : -0.666, arousal: 0.8, dominance: 0.5 }),
    );

    const results = await analyse.handle({
      messages: ['happy words here', '', 42, 'angry words here', 'a'.repeat(5001)],
    });

    expect(sentimentOf(results[0]).score).toBeCloseTo(0.96);
    expect(results[1]).toEqual({ ok: false, reason: 'empty' });
    expect(results[2]).toEqual({ ok: false, reason: 'not_a_string' });
    expect(sentimentOf(results[3]).score).toBeCloseTo(-0.666);
    expect(results[4]).toEqual({ ok: false, reason: 'too_long' }); // limit is 5000 characters for the messages
    expect(classifier.calls).toEqual(['happy words here', 'angry words here']);
  });
});

describe('AnalyseMessages: short messages', () => {
  it('fuses both models into score, intensity, disagreement and confidence', async () => {
    const { analyse } = build(
      () => emotionsWith({ joy: 1 }),
      () => ({ valence: 0.6, arousal: 0.8, dominance: 0.5 }),
    );
    const s = sentimentOf((await analyse.handle({ messages: ['Thanks so much, that fixed it!'] }))[0]);

    expect(s.score).toBeCloseTo(0.78);
    expect(s.disagreement).toBeCloseTo(0.18);
    expect(s.intensity).toBeCloseTo(0.79);
    expect(s.highConfidence).toBe(true);
    expect(s.emotions).toHaveLength(28);
    expect(s.emotions[0]?.label).toBe('joy');
  });

  it('marks happy words with a negative tone as low confidence', async () => {
    const { analyse } = build(
      () => emotionsWith({ joy: 1 }),
      () => ({ valence: -1, arousal: 0.7, dominance: 0.5 }),
    );
    const s = sentimentOf((await analyse.handle({ messages: ['Great, another outage today.'] }))[0]);

    expect(s.disagreement).toBeCloseTo(0.98);
    expect(s.highConfidence).toBe(false);
  });

  it('lets VAD decide alone when the emotion model has no direction', async () => {
    const { analyse } = build(
      () => emotionsWith({ surprise: 0.9 }),
      () => ({ valence: -0.4, arousal: 0.6, dominance: 0.5 }),
    );
    const s = sentimentOf((await analyse.handle({ messages: ['Wow, I did not expect that.'] }))[0]);

    expect(s.score).toBeCloseTo(-0.4);
    expect(s.disagreement).toBe(0);
    expect(s.ambiguity).toBeCloseTo(0.9);
  });
});

describe('AnalyseMessages: long messages', () => {
  it('splits into sentences only above 25 words', async () => {
    const start = 'a b c d e f g h. i j k l m n o p.';
    const exactly25 = `${start} q r s t u v w x y.`;
    const over25 = `${start} q r s t u v w x y z.`;

    const a = build();
    await a.analyse.handle({ messages: [exactly25] });
    expect(a.classifier.calls).toEqual([exactly25]);

    const b = build();
    await b.analyse.handle({ messages: [over25] });
    expect(b.classifier.calls).toEqual(['a b c d e f g h.', 'i j k l m n o p.', 'q r s t u v w x y z.']);
  });

  const filler = Array.from({ length: 14 }, () => 'word').join(' ');
  const angry = `${filler} ANGRY.`;
  const happy = `${filler} HAPPY.`;
  const emotionsByText = (text: string) =>
    text.includes('ANGRY') ? emotionsWith({ anger: 1 }) : emotionsWith({ joy: 1 });

  it('combines sentences, weighting the strongly felt ones more', async () => {
    const { analyse } = build(emotionsByText, (text) => ({
      valence: text.includes('ANGRY') ? -0.666 : 0.96,
      arousal: 0.8,
      dominance: 0.5,
    }));
    const s = sentimentOf((await analyse.handle({ messages: [`${angry} ${happy}`] }))[0]);

    expect(s.score).toBeCloseTo(0.278, 2); // (-0.666 * 0.766 + 0.96 * 1.06) / 1.826
    expect(s.emotions[0]?.label).toBe('joy');
    expect(s.highConfidence).toBe(true);
  });

  it('lets one sarcastic sentence lower confidence for the whole message', async () => {
    const { analyse } = build(emotionsByText, (text) => ({
      valence: text.includes('ANGRY') ? -0.666 : -1, // happy words, negative tone
      arousal: 0.8,
      dominance: 0.5,
    }));
    const s = sentimentOf((await analyse.handle({ messages: [`${angry} ${happy}`] }))[0]);

    expect(s.disagreement).toBeCloseTo(0.98);
    expect(s.highConfidence).toBe(false);
  });
});

describe('AnalyseMessages: failures', () => {
  it('rejects the whole call when a model fails', async () => {
    const { analyse } = build(() => {
      throw new Error('model down');
    });
    await expect(analyse.handle({ messages: ['hello there friend'] })).rejects.toThrow('model down');
  });
});