/**
 * Test doubles for the accuracy tests. Not exported from index.ts.
 *
 * The analysis makes three kinds of LLM call (extract claims, judge a claim, classify documents).
 * FakeLlm answers each from a script instead of calling a real model, and FakeRetriever stands in
 * for the RAG knowledge base by always returning the same two documents.
 */
import type { Accuracy, Document } from 'src/entities';
import type { LlmClient, LlmRequest, Retriever } from 'src/repository';
import type { AnalyzeAccuracyOutputBoundary, AnalyzeAccuracyOutputData } from './output';

export const RETURNS_POLICY: Document = {
  id: 'docs/returns-policy.md::0',
  content:
    'Items may be returned within 30 days of delivery. Refunds are issued within 5 to 7 business days of receiving the item.',
  metadata: { source: 'docs/returns-policy.md' },
};

export const SHIPPING_GUIDE: Document = {
  id: 'docs/shipping-guide.md::0',
  content: 'Free return shipping labels are available for orders over $50.',
  metadata: { source: 'docs/shipping-guide.md' },
};

export class FakeRetriever implements Retriever {
  readonly queries: string[] = [];

  constructor(private readonly docs: Document[] = [RETURNS_POLICY, SHIPPING_GUIDE]) {}

  async search(query: string, limit = 5): Promise<Document[]> {
    this.queries.push(query);
    return this.docs.slice(0, limit);
  }
}

/** A canned reply for each kind of LLM call. */
export interface Script {
  extract?: (req: LlmRequest) => string;
  judge?: (req: LlmRequest) => string;
  classify?: (req: LlmRequest) => string;
}

/** Text that identifies each kind of prompt. */
const MARKERS = {
  extract: 'Find the factual statements',
  judge: 'fact-check one statement',
  classify: 'decide which knowledge-base',
} as const;

export class FakeLlm implements LlmClient {
  readonly requests: LlmRequest[] = [];

  constructor(private readonly script: Script) {}

  async complete(req: LlmRequest): Promise<string> {
    this.requests.push(req);
    for (const kind of Object.keys(MARKERS) as (keyof typeof MARKERS)[]) {
      const reply = this.script[kind];
      if (req.system.includes(MARKERS[kind]) && reply) return reply(req);
    }
    throw new Error(`FakeLlm: no script for prompt: ${req.system.slice(0, 40)}`);
  }

  count(kind: keyof typeof MARKERS): number {
    return this.requests.filter((r) => r.system.includes(MARKERS[kind])).length;
  }
}

/** Records what the interactor reported. */
export class RecordingPresenter implements AnalyzeAccuracyOutputBoundary {
  output: AnalyzeAccuracyOutputData | null = null;
  modelFailed = false;

  present(output: AnalyzeAccuracyOutputData): void {
    this.output = output;
  }

  presentModelFailure(): void {
    this.modelFailed = true;
  }

  get accuracy(): Accuracy {
    if (!this.output) throw new Error('Expected the interactor to present a result.');
    return this.output.accuracy;
  }
}

export const json = (value: unknown): string => JSON.stringify(value);
