export interface UploadDocumentOutputBoundary {
  present(output: UploadDocumentOutputData): void;
  presentBadRequest(message: string): void;
  presentServiceUnavailable(): void;
}

export interface UploadDocumentOutputData {
  document: {
    filename: string;
    originalName: string;
    size: number;
    chunksStored: number;
  };
}
