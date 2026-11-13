/**
 * Represents a document chunk stored and retrieved in the RAG pipeline.
 */
export interface Document {
  /** Optional unique identifier for the document chunk. */
  id?: string;
  /** Text content of the document chunk. */
  content: string;
  /** Optional metadata associated with the chunk (e.g. source file path). */
  metadata?: Record<string, unknown>;
}
