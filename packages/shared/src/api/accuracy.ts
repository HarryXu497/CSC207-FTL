import type { Accuracy } from '../repository/database/accuracy';
import type { Message } from '../repository/database/messages';

/** POST /api/accuracy/analyze */
export interface AnalyzeAccuracyRequest {
  messages: Message[];
  /** Optional call topic; gives the analysis extra context. */
  topic?: string;
}

export interface AnalyzeAccuracyResponse {
  accuracy: Accuracy;
}
