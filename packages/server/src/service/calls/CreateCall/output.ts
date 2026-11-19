export interface CreateCallOutputBoundary {
  present(output: CreateCallOutputData): void;
  presentBadRequest(message: string): void;
}

export interface CreateCallOutputData {
  callId: string;
}
