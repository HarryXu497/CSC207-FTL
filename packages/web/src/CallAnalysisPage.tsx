import { useEffect, useMemo, useState } from 'react';
import Conversation from './components/Conversation';
import NavBar from './components/NavBar';
import type { Message, MessageSentiment, SentimentScore } from '@recall/shared';
import { api } from './api';

const callId = 'kFUP9GB6kqRGAH6PejgE';

export default function CallAnalysisPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentiments, setSentiments] = useState<MessageSentiment[]>([]);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  const sentimentMap = useMemo(() => {
    const scores = new Map<string, SentimentScore>();
    for (const { messageId, result } of sentiments) {
      if (result.ok) scores.set(messageId, result.sentiment);
    }
    return scores;
  }, [sentiments]);

  useEffect(() => {
    const es = new EventSource(`/api/calls/${callId}/messages/stream`);

    es.onmessage = (event) => {
      setMessages(JSON.parse(event.data) as Message[]);
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    const controller = new AbortController();
    async function load() {
      try {
        const { sentiments } = await api.getCallSentiment(callId, controller.signal);
        if (controller.signal.aborted) return;
        setSentiments(sentiments);
        setSentimentError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSentimentError(error instanceof Error ? error.message : 'Could not load sentiment.');
      }
    }
    void load();
    return () => controller.abort();
  }, [messages]);

  return (
    <main className="min-h-screen w-full">
      <NavBar className="mb-4" />
      <h1 className="mb-4 text-left text-2xl font-semibold p-4">Call Analysis</h1>
      {sentimentError && <p role="alert">{sentimentError}</p>}
      <div className="flex gap-4 pb-4">
        {/* <div className="flex-col gap-4 ml-4 w-1/4 h-[calc(100vh-8rem)]">
          <div className="flex w-full gap-4 mb-4">
            <Card className="scoreCardSimple">
              {' '}
              <h1>Accuracy</h1> <Score score={85} />
            </Card>
            <Card className="scoreCardSimple">
              {' '}
              <h1>Sentiment</h1> <Score score={70} />
            </Card>
          </div>
          <Card className="feedback">
            {' '}
            <h1>Feedback</h1>
            <ul className="list-disc pl-5">
              <li>Agent did not explain why they needed the customer's information</li>
              <li>Agent did not provide clear instructions for the customer to follow</li>
              <li>Agent was not helpful in resolving the customer's issue</li>
            </ul>
          </Card>
        </div> */}
        <div className="mr-4 w-full">
          <Conversation
            className="conversation"
            messages={messages}
            sentimentMap={sentimentMap}
            title="Upgrade Plan Error"
          />
        </div>
      </div>
    </main>
  );
}
