import { GetCalls } from './GetCalls';
import { PostCalls } from './PostCalls';

export const CallsService = {
  GetCalls,
  PostCalls,
} as const;

export * from './controller';
export * from './CreateCall';
export * from './DeleteCall';
export * from './GetCall';
