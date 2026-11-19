import { GetCall } from './GetCall';
import { GetCalls } from './GetCalls';
import { PostCalls } from './PostCalls';

export const CallsService = {
  GetCalls,
  PostCalls,
  GetCall,
} as const;

export * from './controller';
export * from './CreateCall';
export * from './DeleteCall';