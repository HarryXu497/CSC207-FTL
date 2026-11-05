/**
 * What the accuracy analysis needs from the RAG system: relevant knowledge-base chunks for a text.
 *
 * Structurally identical to `Retriever` in repository/rag/retriever (PR #14), so `ChromaRetriever`
 * and `InMemoryRetriever` can be passed in directly. Declared here so this feature does not depend
 * on that PR landing first.
 */
export interface Document {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceRetriever {
  search(query: string, limit?: number): Promise<Document[]>;
}
