import type { Call } from 'src/entities';

export interface GetCallOutputBoundary {
  present(output: GetCallOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface GetCallOutputData {
  call: Call;
}
