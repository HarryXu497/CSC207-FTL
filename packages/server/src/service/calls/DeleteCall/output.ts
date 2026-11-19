export interface DeleteCallOutputBoundary {
  presentSuccess(output: DeleteCallOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface DeleteCallOutputData {
  callId: string;
}