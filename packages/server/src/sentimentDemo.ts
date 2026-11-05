/**
 * Manual demo for the sentiment analyser.
 * Wires the real models into AnalyseMessages by hand and prints the results.
 *
 * command to run:
 *   $env:MODEL_DIR="C:\Users\shaya\VsCodeProjects\CSC207-FTL\packages\server\models"; npm --workspace @recall/server run sentiment:demo
 */
import path from 'node:path';
import { GoEmotionsClassifier, VadBertEstimator } from './repository/sentiment/TransformersModels';
import { AnalyseMessages } from './service/sentiment/AnalyseMessages';

const TOP_EMOTIONS_TO_SHOW = 5; // display concern, so it lives here and not in the service

const TEST_MESSAGES: unknown[] = [
  // clearly positive
  'Thanks so much, that fixed it!',
  "You've been incredibly helpful, I really appreciate it.",
  'Great, it works now. Have a good day!',

  // clearly negative
  'This is absolutely unacceptable!!',
  "I've been waiting two weeks and nobody has replied to me.",
  "I'm so frustrated, this is the third time I've had to contact you.",

  // mild vs. intense (compare intensity values)
  "I'm a bit annoyed that it's late.",
  "I'm furious, this is a complete disaster.",

  // anxious / helpless
  "I don't know what to do, I'm really worried about my account.",

  // ambiguous
  'Wait, what is going on here?',
  "Hmm, I'm not sure I understand how this works.",
  'Wow, I did not expect that.',

  // neutral / informational
  'My order number is 48213.',
  "I'll check my email and get back to you.",

  // short
  'ok',
  'fine.',
  'thanks',

  // sarcasm (watch the disagreement value)
  'Great, another outage. Just what I needed.',
  "Oh wonderful, you've lost my order again.",

  // mixed feelings
  "Thanks for the help, but I'm still really disappointed with the service.",

  // shouting (the model lowercases input, so caps are invisible to it)
  'I AM SO DONE WITH THIS',
  'i am so done with this',

  // long message: exercises the sentence-splitting path (more than 25 words)
  "I called last week about my order. Nobody replied. I called again on Monday and was told it would be fixed. " +
    "It still isn't fixed and I'm honestly exhausted. Thank you to the one person who was kind, though.",

  // invalid input: should come back as failures, not crash the batch
  '',
  '   ',
  42,
  null,
];

async function main(): Promise<void> {
  const modelDir = process.env.MODEL_DIR;
  if (!modelDir) {
    throw new Error('Set MODEL_DIR to the folder that contains goemotions/ and vad/.');
  }
  const resolvedDir = path.resolve(modelDir);

  console.log(`Loading models from ${resolvedDir} ...`);
  const classifier = await GoEmotionsClassifier.create(resolvedDir);
  const vadEstimator = await VadBertEstimator.create(resolvedDir);
  const analyse = new AnalyseMessages(classifier, vadEstimator);

  console.log('\n=== analyse.handle OUTPUT ===');
  const results = await analyse.handle({ messages: TEST_MESSAGES });

  TEST_MESSAGES.forEach((message, i) => {
    const result = results[i];
    console.log(`\n${JSON.stringify(message)}`);

    if (!result) {
      console.log('  (no result returned)');
    } else if (!result.ok) {
      console.log(`  FAILED: ${result.reason}`);
    } else {
      const s = result.sentiment;
      console.log({
        score: Number(s.score.toFixed(3)),
        intensity: Number(s.intensity.toFixed(3)),
        highConfidence: s.highConfidence,
        ambiguity: Number(s.ambiguity.toFixed(3)),
        disagreement: Number(s.disagreement.toFixed(3)),
        topEmotions: s.emotions
          .slice(0, TOP_EMOTIONS_TO_SHOW)
          .map((e) => `${e.label} ${e.score.toFixed(2)}`)
          .join(', '),
      });
    }
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});