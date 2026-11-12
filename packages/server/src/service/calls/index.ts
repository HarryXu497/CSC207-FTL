import { DeleteCall } from './DeleteCall';
import { GetCall } from './GetCall';
import { GetCalls } from './GetCalls';
import { PostCalls } from './PostCalls';

export const CallsService = {
  GetCalls,
  PostCalls,
  GetCall,
  DeleteCall,
} as const;
