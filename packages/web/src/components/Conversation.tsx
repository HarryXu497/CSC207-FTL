import { useLayoutEffect, useRef } from 'react';
import Card from './Card';
import Message from './Message';
import type { Message as MessageData, SentimentScore } from '@recall/server/entities';

type ConversationProps = {
  messages: MessageData[];
  sentimentMap: Map<string, SentimentScore>;
  title: string;
  className?: string;
  onBranch?: (messageId: string) => void;
  branchingMessageId?: string | null;
  followLatest?: boolean;
};

export default function Conversation({
  messages,
  sentimentMap,
  title,
  className = '',
  onBranch,
  branchingMessageId = null,
  followLatest = false,
}: ConversationProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const latestMessageId = messages.at(-1)?.id;

  // Let a reader who scrolled up explicitly resume following the latest messages.
  function showLatest() {
    following.current = true;
    if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }

  // Follow new messages only while the reader is already at the bottom of the transcript.
  useLayoutEffect(() => {
    if (followLatest && following.current && viewport.current) {
      viewport.current.scrollTop = viewport.current.scrollHeight;
    }
  }, [followLatest, latestMessageId]);

  return (
    <Card
      ref={viewport}
      className={`conversation ${className}`}
      role={followLatest ? 'region' : undefined}
      aria-label={followLatest ? title : undefined}
      tabIndex={followLatest ? 0 : undefined}
      onScroll={
        followLatest
          ? (event) => {
              const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
              following.current = scrollHeight - scrollTop - clientHeight < 40;
            }
          : undefined
      }
    >
      <header className="conversationHeader flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold p-4 align-left">{title}</h2>
        {followLatest && (
          <button type="button" onClick={showLatest} className="p-2 text-sm font-medium underline">
            Latest messages ↓
          </button>
        )}
      </header>
      <div className="conversationBody">
        {messages.map((message) => (
          <Message
            key={message.id}
            name={message.role}
            time={new Date(message.createdAt)}
            content={message.content}
            sentiment={sentimentMap.get(message.id)}
            onBranch={onBranch && message.role === 'agent' ? () => onBranch(message.id) : undefined}
            branching={message.id === branchingMessageId}
            branchDisabled={branchingMessageId !== null}
          />
        ))}
      </div>
      <div className="conversationEnd">
        <p>This is the end of the conversation transcript.</p>
      </div>
    </Card>
  );
}
