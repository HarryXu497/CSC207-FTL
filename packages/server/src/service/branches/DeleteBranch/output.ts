export interface DeleteBranchOutputBoundary {
  present(): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}