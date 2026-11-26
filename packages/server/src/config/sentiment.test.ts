import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { resolveSentimentModelPath } from './sentiment';

it('finds the downloaded sentiment models without an environment override', () => {
  const directory = mkdtempSync(join(tmpdir(), 'recall-model-config-'));
  try {
    expect(resolveSentimentModelPath({}, directory)).toBeNull();

    const models = join(directory, 'models');
    const files = [
      'goemotions-roberta/config.json',
      'goemotions-roberta/tokenizer.json',
      'goemotions-roberta/onnx/model_quantized.onnx',
      'vad/config.json',
      'vad/tokenizer.json',
      'vad/onnx/model.onnx',
    ];
    for (const file of files) {
      const path = join(models, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '');
    }

    expect(resolveSentimentModelPath({}, directory)).toBe(models);
    expect(resolveSentimentModelPath({ MODEL_DIR: 'custom' }, directory)).toBe(
      join(directory, 'custom'),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
