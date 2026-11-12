/**
 * Tests for TransformersModels.ts: the GoEmotionsClassifier and the VadBertEstimator.
 *
 * Run with: npx vitest run TransformerModels.test.ts
 */

import { EMOTION_LABELS } from '@recall/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoEmotionsClassifier, VadBertEstimator } from './TransformersModels';

/**
 * Creates the fake pieces of the Hugging Face library that the tests will use.
 */
const mocks = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  pipeline: vi.fn(),
  tokenizerFromPretrained: vi.fn(),
  modelFromPretrained: vi.fn(),
}));

/**
 * Swaps the real @huggingface/transformers package for the fakes above.
 *
 * When TransformersModels.ts imports the library, it gets this fake version instead of the
 * real one, so no real model is loaded during the tests.
 */
vi.mock('@huggingface/transformers', () => ({
  env: mocks.env,
  pipeline: mocks.pipeline,
  AutoTokenizer: { from_pretrained: mocks.tokenizerFromPretrained },
  AutoModelForSequenceClassification: { from_pretrained: mocks.modelFromPretrained },
}));

/**
 * Wipes the record of calls from the fake functions before every test.
 *
 * The fakes (pipeline, tokenizerFromPretrained, modelFromPretrained) remember every time they
 * were called and with what. Clearing before each test ensures every test start with a clean history.
 */
beforeEach(() => {
  vi.clearAllMocks();
});

describe('GoEmotionsClassifier', () => {
  it('should return all 28 labels, and rejects unknown labels or a wrong count', async () => {
    //make the fake set of Emotion to NRC valance score map
    const valid = EMOTION_LABELS.map((label, i) => ({ label, score: i / 100 }));
    //make the fake classifier
    const classifierWith = async (output: unknown) => {
      mocks.pipeline.mockResolvedValue(vi.fn().mockResolvedValue(output));
      return GoEmotionsClassifier.create('C:/models');
    };

    //first, we ensure the model returns all 28 label results
    expect(await (await classifierWith(valid)).classify('hi')).toHaveLength(28);

    const unknownLabel = [{ label: 'sarcasm', score: 0.5 }, ...valid.slice(1)];
    //now, ensure the model throws an error for an unknown label
    await expect((await classifierWith(unknownLabel)).classify('hi')).rejects.toThrow(
      /unexpected emotion label/i,
    );
    //lastly, it should throw an error for an invalid emotion to nrc valance score map
    await expect((await classifierWith(valid.slice(1))).classify('hi')).rejects.toThrow(
      /expected 28/i,
    );
  });
});

describe('VadBertEstimator', () => {
  /**
   * This is a test helper function that creates a VadBertEstimator whose fake model returns the numbers you give it.
   *
   * It sets up the fake tokenizer and fake model so that estimate() can run without loading
   * the real vad-bert files.
   *
   * @param logits - The raw model outputs, in the order (valence, arousal, dominance). Real vad-bert
   * values are on a 1-5 scale.
   * @returns A VadBertEstimator wired to the fake tokenizer and fake model.
   */
  async function estimatorReturning(logits: number[]) {
    mocks.tokenizerFromPretrained.mockResolvedValue(vi.fn().mockReturnValue({}));
    mocks.modelFromPretrained.mockResolvedValue(
      vi.fn().mockResolvedValue({ logits: { data: new Float32Array(logits) } }),
    );
    return VadBertEstimator.create('C:/models');
  }

  it('should scale the 1-5 model output to the interface ranges', async () => {
    expect(await (await estimatorReturning([5, 3, 1])).estimate('hi')).toEqual({
      valence: 1,
      arousal: 0.5,
      dominance: 0,
    });
    expect(await (await estimatorReturning([1, 5, 3])).estimate('hi')).toEqual({
      valence: -1,
      arousal: 1,
      dominance: 0.5,
    });
  });

  it('should throw when the model returns fewer than three outputs', async () => {
    await expect((await estimatorReturning([3, 3])).estimate('hi')).rejects.toThrow(/fewer than 3/);
  });
});
