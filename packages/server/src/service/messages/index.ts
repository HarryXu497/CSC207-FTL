export * from './controller';
export * from './ListMessages';
export * from './PostMessage';

import { PostMessages } from './PostMessages';
import { PostMessagesBatch } from './PostMessagesBatch';
import { StreamMessages } from './StreamMessages';

export const MessagesService = {
  PostMessages,
  PostMessagesBatch,
  StreamMessages,
} as const;
