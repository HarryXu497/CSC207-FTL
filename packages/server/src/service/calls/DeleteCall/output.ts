export interface DeleteCallOutputBoundary {
  present(): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}
