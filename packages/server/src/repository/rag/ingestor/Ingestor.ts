export interface Ingestor {
  /** Ingest a directory and return the number of chunks stored. */
  ingest(directory: string): Promise<number>;

  /** Ingest one document and return the number of chunks stored. */
  ingestFile(filePath: string): Promise<number>;
}
