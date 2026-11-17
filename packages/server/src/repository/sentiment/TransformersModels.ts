/**
 * Hugging Face (transformers.js) implementations of the sentiment model interfaces.
 * Only this file may import @huggingface/transformers.
 */
import { EMOTION_LABELS, isEmotionLabel, type Emotion } from 'src/entities';
import type { EmotionClassifier, Vad, VadEstimator } from './SentimentModels';

// Minimal type descriptions of the three library objects this file uses to ensure type safety
type TextClassifier = (text: string, options: { top_k: number }) => Promise<unknown>;
type VadTokenizer = (text: string, options: { padding: boolean; truncation: boolean }) => unknown;
type VadModel = (inputs: unknown) => Promise<{ logits: { data: ArrayLike<number> } }>;

// Model folder names inside MODEL_DIR
const GOEMOTIONS_MODEL = 'goemotions-roberta';
const VAD_MODEL = 'vad';

/**
 * Loads the Hugging Face transformers library and points it at local model files.
 *
 * @param modelDir - Absolute path to the folder containing the model
 * directories (e.g. `goemotions/` and `vad/`).
 * @returns The `@huggingface/transformers` module, configured for local models.
 */
async function loadTransformers(modelDir: string) {
  const transformers = await import('@huggingface/transformers');
  transformers.env.localModelPath = modelDir;
  transformers.env.allowRemoteModels = false;
  return transformers;
}

/**
 * A class that implements emotion classifier backed by the GoEmotions model (https://huggingface.co/SamLowe/roberta-base-go_emotions), run locally through
 * Hugging Face transformers.js.
 *
 * This is the only part of the codebase that directly uses the GoEmotion model. The rest of the app depends
 * on the interface, thus another emotion model can replace this class without touching the rest of the codebase
 *
 * Attribute:
 * -classifier: the loaded GoEmotions classier that is set once in the constructor and never replaced.
 */
export class GoEmotionsClassifier implements EmotionClassifier {
  private readonly classifier: TextClassifier;

  private constructor(classifier: TextClassifier) {
    this.classifier = classifier;
  }

  /**
   * Loads the GoEmotions model from disk and returns a ready to use classifier.
   * Intend to call once at startup and reuse the instance, because loading is slow.
   *
   * @param modelDir - Absolute path to the folder containing the `goemotions/` model directory.
   * @returns A classifier with the model already loaded.
   */
  static async create(modelDir: string): Promise<GoEmotionsClassifier> {
    const { pipeline } = await loadTransformers(modelDir);
    const classifier = await pipeline('text-classification', GOEMOTIONS_MODEL, { dtype: 'q8' });
    return new GoEmotionsClassifier(classifier as unknown as TextClassifier);
  }

  /**
   * Scores a piece of text against all 28 GoEmotions labels.
   * Every label is returned, not just the top few, because many small
   * probabilities still matter for the valence calculation. Scores are
   * independent probabilities in [0, 1] and are not expected to sum to 1.
   *
   * @param text - The text to classify. Must be non-empty; the caller validates this.
   * @returns One Emotion per label, in the order the model returned them (highest score first).
   * @throws If the model returns a label outside the known 28, or the wrong number of labels.
   */
  async classify(text: string): Promise<Emotion[]> {
    const rawOutput = (await this.classifier(text, {
      top_k: EMOTION_LABELS.length,
    })) as { label: string; score: number }[];

    for (const emotion of rawOutput) {
      if (!isEmotionLabel(emotion.label)) {
        throw new Error(
          `ERROR: The following is an unexpected emotion label from GoEmotions model: ${emotion.label}`,
        );
      }
    }

    const emotions = rawOutput as Emotion[];

    if (emotions.length !== EMOTION_LABELS.length) {
      throw new Error(`ERROR: expected ${EMOTION_LABELS.length} emotions, got ${emotions.length}`);
    }
    return emotions;
  }
}

// vad-bert outputs 1-5 for each dimension. That is a model detail, so it stays in here.
const VAD_MIN = 1;
const VAD_MAX = 5;
function toMinusOneToOne(n: number) {
  return (2 * (n - VAD_MIN)) / (VAD_MAX - VAD_MIN) - 1;
}
function toZeroToOne(n: number) {
  return (n - VAD_MIN) / (VAD_MAX - VAD_MIN);
}

/**
 * A class that implements VAD (valence, arousal, dominance) estimator using the vad-bert model (https://huggingface.co/RobroKools/vad-bert),
 * run locally through Hugging Face transformers.js.
 *
 * The model outputs each of valence, arousal, dominance on a 1-5
 * scale; however, to stay consistent with the GoEmotions model, valence values are converted to
 * range [-1,1] and the other two are converted to range [0,1]. Callers never see raw model values.
 *
 * Like the GoEmotions Classifier, this is the only part of the codebase that directly uses the Vad bert model.
 * The rest of the app depends on the interface, thus another emotion model can replace this class without touching the rest of the codebase
 *
 * Attributes:
 * -tokenizer: converts raw text into the token inputs vad-bert expects
 * -model: the loaded vad-bert model that returns three raw logits on a 1-5 scale: valence, arousal, dominance.
 */
export class VadBertEstimator implements VadEstimator {
  private readonly tokenizer: VadTokenizer;
  private readonly model: VadModel;

  private constructor(tokenizer: VadTokenizer, model: VadModel) {
    this.tokenizer = tokenizer;
    this.model = model;
  }

  /**
   * Loads the vad-bert tokenizer and model from disk and returns a ready to use VAD estimator.
   * Intend to call once at startup and reuse the instance, because loading is slow.
   *
   * @param modelDir - absolute path to the folder containing the `vad/` model directory.
   * @returns a VAD estimator with the tokenizer and model already loaded.
   */
  static async create(modelDir: string): Promise<VadBertEstimator> {
    const { AutoTokenizer, AutoModelForSequenceClassification } = await loadTransformers(modelDir);
    const tokenizer = await AutoTokenizer.from_pretrained(VAD_MODEL);
    const model = await AutoModelForSequenceClassification.from_pretrained(VAD_MODEL, {
      dtype: 'fp32',
    });
    return new VadBertEstimator(tokenizer as unknown as VadTokenizer, model as unknown as VadModel);
  }

  /**
   * Estimates how positive (Valence), energetic (Arousal) and in-control (dominance) a piece of text sounds.
   *
   * Input longer than the model's limit is truncated by the tokenizer, so only
   * the start of a very long text influences the result. We intend to have checks when using
   * model to ensure that a text too long never reaches the model in the first place and is broken up.
   *
   * @param text - The text to analyse. Must be non-empty; the caller validates this.
   * @returns A VAD with valence in [-1, 1] and arousal and dominance in [0, 1].
   */
  async estimate(text: string): Promise<Vad> {
    const inputs = await this.tokenizer(text, { padding: true, truncation: true });
    const { logits } = await this.model(inputs);
    const [v, a, d] = Array.from(logits.data);

    if (v === undefined || a === undefined || d === undefined) {
      throw new Error('vad-bert returned fewer than 3 outputs');
    }
    return {
      valence: toMinusOneToOne(v),
      arousal: toZeroToOne(a),
      dominance: toZeroToOne(d),
    };
  }
}
