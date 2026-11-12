import { GetMessages } from './GetMessages';
import { PostMessages } from './PostMessages';
import { PostMessagesBatch } from './PostMessagesBatch';
import { StreamMessages } from './StreamMessages';

export const MessagesService = {
  GetMessages,
  PostMessages,
  PostMessagesBatch,
  StreamMessages,
} as const;
