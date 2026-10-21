export interface Ingestor {
  // Return chunks stored
  ingest(directory: string): Promise<number>;
}
