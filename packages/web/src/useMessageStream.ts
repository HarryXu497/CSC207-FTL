import { useEffect, useState } from 'react';
import type { Message } from '@recall/server/entities';
import { messageStreamUrl } from './api';

interface MessageStreamOptions {
  callId: string;
  branchId?: string;
  enabled: boolean;
  onMessages: (messages: Message[]) => void;
}

export function useMessageStream({ callId, branchId, enabled, onMessages }: MessageStreamOptions) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource(messageStreamUrl(callId, branchId));
    source.onmessage = (event) => {
      try {
        const messages: unknown = JSON.parse(event.data);
        if (!Array.isArray(messages)) throw new Error('Expected a message list.');
        onMessages(messages as Message[]);
        setError(null);
      } catch {
        setError('Could not read a conversation update.');
      }
    };
    source.onerror = () => setError('Live updates interrupted. Reconnecting…');
    return () => source.close();
  }, [callId, branchId, enabled, onMessages]);

  return error;
}
