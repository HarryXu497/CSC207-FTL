import type { Document } from 'src/entities';

/**
 * Port: what the accuracy analysis needs from the RAG system, which is relevant knowledge-base
 * chunks for a piece of text. Read-only by design.
 *
 * Structurally identical to `Retriever` in repository/rag/retriever, so `ChromaRetriever` and
 * `InMemoryRetriever` can be passed in directly.
 */
export interface EvidenceRetriever {
  search(query: string, limit?: number): Promise<Document[]>;
}
