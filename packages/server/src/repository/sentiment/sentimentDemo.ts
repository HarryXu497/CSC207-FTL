/**
 * Manual demo for the sentiment analyser.
 * PLEASE REFER TO THIS FILE, TO SEE HOW TO USE SENTIMENT ANALYSER
 * Passes the real modelss into AnalyseMessages and prints the results.
 *
 * command to run:
 *   npm --workspace @recall/server run sentiment:demo
 */

import path from 'node:path';
import { GoEmotionsClassifier, VadBertEstimator } from './TransformersModels';
import { AnalyseMessages } from './AnalyseMessages';

const TOP_EMOTIONS_TO_SHOW = 5; // display concern, so it lives here and not in the service

//A series of messages used not only for testing but also demo purposes
const TEST_MESSAGES: unknown[] = [
  // Super Positive Examples
  'Thanks so much, that fixed it!',
  "You've been incredibly helpful, I really appreciate it.",
  'Great, it works now. Have a good day!',

  // Super Negative Examples
  'This is absolutely unacceptable!!',
  "I've been waiting two weeks and nobody has replied to me.",
  "I'm so frustrated, this is the third time I've had to contact you.",

  // Two diffrent intensities of anger
  "I'm a bit annoyed that it's late.",
  "I'm furious, this is a complete disaster.",

  // Anxious / helpless example
  "I don't know what to do, I'm really worried about my account.",

  // Ambiguous examples (should be high ambigous socre)
  'Wait, what is going on here?',
  "Hmm, I'm not sure I understand how this works.",
  'Wow, I did not expect that.',

  // Neutral examples
  'My order number is 48213.',
  "I'll check my email and get back to you.",

  // Short examples (should be low confidence)
  'ok',
  'fine.',
  'thanks',

  // Mixed feelings example
  "Thanks for the help, but I'm still really disappointed with the service.",

  // long message to test the sentence-splitting path
  'I called last week about my order. Nobody replied. I called again on Monday and was told it would be fixed. ' +
    "It still isn't fixed and I'm honestly exhausted. Thank you to the one person who was kind, though.",

  // invalid input: should come back as failures, not crash the batch due to error handling
  '',
  '   ',
  42,
  null,
];

/**
 * main function that runs the demo. Async b/c body uses await.
 */
async function main(): Promise<void> {
  const modelDir = process.env.MODEL_DIR;

  if (!modelDir) {
    throw new Error('Set MODEL_DIR to the folder that contains goemotions/ and vad/.');
  }

  const resolvedDir = path.resolve(modelDir);

  const classifier = await GoEmotionsClassifier.create(resolvedDir);
  const vadEstimator = await VadBertEstimator.create(resolvedDir);
  const analyse = new AnalyseMessages(classifier, vadEstimator);

  console.log('\n=== DEMO OUTPUT ===');
  const results = await analyse.handle({ messages: TEST_MESSAGES });

  TEST_MESSAGES.forEach((message, i) => {
    const result = results[i];
    console.log(`\n${JSON.stringify(message)}`);

    if (!result) {
      console.log('(no result returned)');
    } else if (!result.ok) {
      console.log(`FAILED: ${result.reason}`);
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
