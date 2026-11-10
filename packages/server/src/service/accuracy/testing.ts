/**
 * Test doubles shared by the accuracy tests: a scripted LLM and a keyword retriever.
 * Deliberately not exported from index.ts; production code never imports this.
 */
import type { LlmClient, LlmRequest } from 'src/repository';
import type { Document, EvidenceRetriever } from './EvidenceRetriever';

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

/** Always returns the same documents, and records the queries it was asked. */
export class FakeRetriever implements EvidenceRetriever {
  readonly queries: string[] = [];

  constructor(private readonly docs: Document[] = [RETURNS_POLICY, SHIPPING_GUIDE]) {}

  async search(query: string, limit = 5): Promise<Document[]> {
    this.queries.push(query);
    return this.docs.slice(0, limit);
  }
}

export interface Script {
  extract?: (req: LlmRequest) => string;
  judge?: (req: LlmRequest) => string;
  classify?: (req: LlmRequest) => string;
}

/** Answers each kind of prompt from a script and records every request. */
export class FakeLlm implements LlmClient {
  readonly requests: LlmRequest[] = [];

  constructor(private readonly script: Script) {}

  async complete(req: LlmRequest): Promise<string> {
    this.requests.push(req);
    if (req.system.includes('Find the factual statements'))
      return this.run(this.script.extract, req);
    if (req.system.includes('fact-check one statement')) return this.run(this.script.judge, req);
    if (req.system.includes('decide which knowledge-base'))
      return this.run(this.script.classify, req);
    throw new Error(`FakeLlm: unrecognised prompt: ${req.system.slice(0, 40)}`);
  }

  count(kind: 'extract' | 'judge' | 'classify'): number {
    const marker = {
      extract: 'Find the factual statements',
      judge: 'fact-check one statement',
      classify: 'decide which knowledge-base',
    }[kind];
    return this.requests.filter((r) => r.system.includes(marker)).length;
  }

  private run(fn: ((req: LlmRequest) => string) | undefined, req: LlmRequest): string {
    if (!fn) throw new Error('FakeLlm: no script for this prompt');
    return fn(req);
  }
}

export const json = (value: unknown): string => JSON.stringify(value);
