import { PostCalls } from './PostCalls';

export const CallsService = {
  PostCalls,
} as const;

export * from './controller';
export * from './CreateCall';
export * from './GetCall';
export * from './ListCalls';
export * from './DeleteCall';
