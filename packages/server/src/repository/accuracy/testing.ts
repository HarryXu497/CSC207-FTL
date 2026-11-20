/**
 * Test doubles, not exported from index.ts. FakeLlm answers each kind of prompt from a script, and
 * FakeRetriever stands in for the RAG knowledge base by always returning the same two documents.
 */
import type { Document } from 'src/entities';
import type { LlmClient, LlmRequest } from '../llm';
import type { Retriever } from '../rag';

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
  constructor(private readonly docs: Document[] = [RETURNS_POLICY, SHIPPING_GUIDE]) {}

  async search(_query: string, limit = 5): Promise<Document[]> {
    return this.docs.slice(0, limit);
  }
}

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
}

export const json = (value: unknown): string => JSON.stringify(value);
