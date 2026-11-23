export * from './controller';
export * from './ListMessages';

import { PostMessages } from './StreamMessages/PostMessages';
import { PostMessagesBatch } from './StreamMessages/PostMessagesBatch';
import { StreamMessages } from './StreamMessages/StreamMessages';

export const MessagesService = {
  PostMessages,
  PostMessagesBatch,
  StreamMessages,
} as const;
