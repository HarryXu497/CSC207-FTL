import Card from './Card';
import Message from './Message';
import type { Message as MessageData, SentimentScore } from '@recall/shared';

type ConversationProps = {
  messages: MessageData[];
  sentimentMap: Map<string, SentimentScore>;
  title: string;
  className?: string;
};

export default function Conversation({ messages, sentimentMap, title }: ConversationProps) {
  return (
    <Card className="conversation">
      <header className="conversationHeader">
        <h2 className="text-xl font-bold p-4 align-left">{title}</h2>
      </header>
      <div className="conversationBody">
        {messages.map((message) => (
          <Message
            key={message.id}
            name={message.role}
            time={new Date(message.createdAt)}
            content={message.content}
            sentiment={sentimentMap.get(message.id)}
          />
        ))}
      </div>
      <div className="conversationEnd">
        <p>This is the end of the conversation transcript.</p>
      </div>
    </Card>
  );
}
