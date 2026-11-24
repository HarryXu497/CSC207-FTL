export * from './controller';
export * from './ListMessages';
export * from './PostMessage';
export * from './StreamMessages';

import { PostMessages } from './PostMessages';
import { PostMessagesBatch } from './PostMessagesBatch';

export const MessagesService = {
  PostMessages,
  PostMessagesBatch,
} as const;
