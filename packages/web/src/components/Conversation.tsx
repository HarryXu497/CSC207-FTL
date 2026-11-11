import Card from './Card';
import Message from './Message';
import type { MessageData } from '../tempCall';

type ConversationProps = {
  messages: MessageData[];
  title: string;
  className?: string
};


export default function Conversation({ messages, title }: ConversationProps){
    return (
        <Card className="conversation">
            <header className="conversationHeader">
                <h2 className="text-xl font-bold p-4 align-left">{title}</h2>
            </header>
            <div className="conversationBody">
                {messages.map((message) => (
                    <Message
                        key={message.id}
                        name={message.name}
                        time={message.time}
                        content={message.content}
                    />
                ))}
            </div>
            <div className = "conversationEnd">
                <p>This is the end of the conversation transcript.</p>
            </div>
        </Card>
    )
}