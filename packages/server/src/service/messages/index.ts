export * from './controller';
export * from './ListMessages';
export * from './StreamMessages';

import { PostMessages } from './StreamMessages/PostMessages';
import { PostMessagesBatch } from './StreamMessages/PostMessagesBatch';

export const MessagesService = {
  PostMessages,
  PostMessagesBatch,
} as const;
