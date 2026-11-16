# Sarcasm Detection Proposal

## Summary

This branch adds an experimental irony detector to the sentiment demo. It
reports an `ironyScore` from 0 to 1 but does not change sentiment scores or
API responses.

The current model is useful as a baseline, but it often mistakes short sincere
phrases for irony because it was trained on isolated tweets. Before integrating
irony into sentiment scoring, we should evaluate a context-aware model designed
for support conversations.

## Current prototype

The prototype uses
[`Xenova/twitter-roberta-base-irony`](https://huggingface.co/Xenova/twitter-roberta-base-irony),
an ONNX/Transformers.js conversion of Cardiff NLP's Twitter-RoBERTa irony
model.

The branch adds:

- An `IronyDetector` interface that returns `P(irony)` from 0 to 1.
- A `TwitterRobertaIronyDetector` implementation using local quantized ONNX
  weights.
- An `ironyScore` field in the manual sentiment demo.
- Tests for label handling and score validation.
- The irony model to the `models:download` script.

The detector is loaded only by `sentimentDemo.ts`. `AnalyseMessages`, the
sentiment endpoint, and the `SentimentScore` entity are unchanged.

### Run the demo

From the repository root:

```powershell
npm install
npm run models:download
```

Create `packages/server/.env` and set:

```dotenv
MODEL_DIR=./models
```

Then run:

```powershell
npm --workspace @recall/server run sentiment:demo
```

Each valid example now includes an irony score:

```text
{
  score: 0.52,
  ironyScore: 0.99,
  intensity: 0.598,
  ...
}
```

Demo messages can be added to the `TEST_MESSAGES` array in
`packages/server/src/repository/sentiment/sentimentDemo.ts`.

## What we learned

The model scores obvious irony highly:

- `Oh fantastic, another outage. Exactly what I needed today.`
- `Wonderful, I've only been waiting on hold for two hours.`
- `Great job fixing it. The problem is somehow even worse now.`

However, it also scores phrases such as `Thanks for that.` and
`What a surprise.` highly. These phrases may be sincere or sarcastic depending
on the preceding conversation.

This is the main limitation of the current model: it sees only one message and
was trained on tweets, not ordered customer-service conversations. Its output
should be treated as a model signal rather than a calibrated probability for
ReCall users.

## Optional scoring experiment

Irony-based score adjustment should be a **separate commit** from the current
observational prototype. This keeps the existing sentiment behaviour easy to
review and preserves a clean rollback point.

The follow-up commit could add a default-off switch:

```ts
interface ScoringConfig {
  // Existing fields omitted.
  enableIronyAdjustment: boolean;
  ironyAdjustmentThreshold: number;
}
```

When disabled, sentiment results must remain exactly as they are today.

When enabled, the adjustment should happen before GoEmotions is fused with
VAD-BERT. We should not simply negate the final sentiment score: VAD-BERT may
already recognize the negative tone of a sarcastic sentence.

A simple experimental policy is:

1. Leave the emotion valence unchanged below the irony threshold.
2. Gradually invert the emotion valence between the threshold and an irony
   score of 1.
3. Fuse the adjusted emotion valence with VAD as usual.
4. Recalculate disagreement, confidence, intensity, and fragment weights.

For evaluation, the demo should show the raw score, adjusted score, irony
score, and whether adjustment occurred. This policy should remain opt-in until
it improves results on labelled ReCall-style transcripts.

### Moving the current detector beyond the demo

The existing detector can be integrated into the sentiment pipeline without
changing its model adapter:

1. Create `TwitterRobertaIronyDetector` alongside the GoEmotions and VAD
   models in the server composition root.
2. Inject it into `AnalyseMessages` through the `IronyDetector` interface.
3. Run all three models together for each fragment:

   ```ts
   const [emotions, vad, ironyScore] = await Promise.all([
     emotionClassifier.classify(text),
     vadEstimator.estimate(text),
     ironyDetector.detect(text),
   ]);
   ```

4. Add `ironyScore` to the fragment result. Initially, expose it only as
   metadata and leave valence unchanged.
5. If the experimental flag is enabled, apply the adjustment policy before
   calling `fuseValence`.

The feature flag should be read in `src/index.ts` and passed into the scoring
configuration. This keeps environment-specific decisions out of
`AnalyseMessages` and the pure scoring functions.

If `ironyScore` is added to `SentimentScore`, that changes the API response and
should be reviewed as an explicit contract change. A lower-risk first step is
to keep the field in the demo while running evaluation tests, then add it to
the API once its intended consumer is clear.

Tests for this follow-up should verify that:

- The detector runs once per short message or sentence fragment.
- Invalid messages are not sent to any model.
- Scores are identical to today's output when adjustment is disabled.
- Enabling adjustment changes only the emotion-derived valence before fusion.
- Long messages aggregate adjusted fragment scores in the existing way.

## Proposed model: Pipecat Tone reader

The strongest next candidate is the reader from
[`pipecat-ai/tone-models`](https://huggingface.co/pipecat-ai/tone-models).
Unlike the current tweet model, it was designed for voice-agent and support
conversations and can read the preceding turn as context.

The `reader-rc2` model card reports:

- 24.2 million parameters and ONNX weights.
- Sarcasm F1 of 0.903 on expressive call turns.
- One false sarcasm result among 1,496 sincere real-call turns.
- Sarcasm F1 of 0.959 on a support-call evaluation with the preceding agent
  turn supplied.
- Correct results for both sincere and sarcastic praise/thanks pairs 94% of the
  time when context was provided.

These results are promising but not directly comparable with TweetEval. The
labels were produced by a committee of language models, so Pipecat Tone still
needs evaluation on our own transcript examples.

## Why previous-turn context matters

Consider two identical replies:

```text
Previous: "Your account access has been restored."
Current:  "Thanks for that."                       // likely sincere

Previous: "Unfortunately, all of your data was deleted."
Current:  "Thanks for that."                       // likely sarcastic
```

The current detector receives only `Thanks for that.` and cannot distinguish
the two cases. A context-aware interface could be:

```ts
interface IronyInput {
  text: string;
  previousText?: string;
}

interface IronyDetector {
  detect(input: IronyInput): Promise<number>;
}
```

The current Twitter model could ignore `previousText`, allowing both models to
be evaluated behind the same interface. The sentiment endpoint already fetches
call messages in order, so it can pass the previous message when constructing
each input.

For long messages, the first fragment can use the previous call turn, while
later fragments use the preceding fragment.

## Integration difference

The current model is a standard Hugging Face classifier loaded through
`@huggingface/transformers`.

Pipecat Tone uses a specialized ONNX graph and reference runtime. A native Node
adapter would likely require `onnxruntime-node` plus ports of its input
construction, output decoding, and calibration. Fixture tests should confirm
that the Node adapter matches Pipecat's reference output.

## Recommended PR sequence

1. Merge the current observational prototype.
2. Build a small labelled dataset of representative call turns, including the
   preceding turn.
3. Compare the current model with Pipecat Tone, focusing on false positives,
   F1, and calibration.
4. Add the default-off score adjustment in a separate commit.
5. Enable adjustment by default only if it improves end-to-end sentiment
   accuracy.
