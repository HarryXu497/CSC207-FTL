import { resolve } from 'node:path';
import { hasLocalSentimentModels } from '../repository/sentiment/TransformersModels';

export function resolveSentimentModelPath(
  env: NodeJS.ProcessEnv = process.env,
  directory = process.cwd(),
): string | null {
  const configuredPath = env.MODEL_DIR?.trim();
  if (configuredPath) return resolve(directory, configuredPath);

  const modelPath = resolve(directory, 'models');
  return hasLocalSentimentModels(modelPath) ? modelPath : null;
}
