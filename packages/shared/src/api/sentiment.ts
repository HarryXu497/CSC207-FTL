import type { SentimentScore } from '../repository/sentiment';


export type SentimentFailureReason = 'empty' | 'not_a_string' | 'too_long';


export type SentimentResult =
  { ok: true; sentiment: SentimentScore } | { ok: false; reason: SentimentFailureReason };

export interface MessageSentiment {
  messageId: string;
  result: SentimentResult;
}

/** GET*/
export interface GetCallSentimentResponse {
  sentiments: MessageSentiment[];
}

//I INTEND TO COME BACK LATER AND GEt A POST going

/** POST  */
export interface AnalyseMessagesRequest {
  messages: string[];
}

export interface AnalyseMessagesResponse {
  results: SentimentResult[];
}
