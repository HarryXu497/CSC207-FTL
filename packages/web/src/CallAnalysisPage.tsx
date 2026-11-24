import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Conversation from './components/Conversation';
import NavBar from './components/NavBar';
import type { Call, Message, MessageSentiment, SentimentScore } from '@recall/server/entities';
import { api, ApiError } from './api';
import { useMessageStream } from './useMessageStream';

export default function CallAnalysisPage() {
  const { callId } = useParams();
  return callId ? (
    <CallDetails key={callId} callId={callId} />
  ) : (
    <p role="alert">Call not found.</p>
  );
}

function CallDetails({ callId }: { callId: string }) {
  const navigate = useNavigate();
  const active = useRef(false);
  const [branchingMessageId, setBranchingMessageId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentiments, setSentiments] = useState<MessageSentiment[]>([]);
  const [sentimentError, setSentimentError] = useState<string | null>(null);
  const streamError = useMessageStream({ callId, enabled: call !== null, onMessages: setMessages });

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function startBranch(messageId: string) {
    if (branchingMessageId !== null) return;
    const branchIndex = messages.findIndex((message) => message.id === messageId);
    if (branchIndex === -1) {
      setBranchError('This response is no longer available. Reload the call and try again.');
      return;
    }
    setBranchingMessageId(messageId);
    setBranchError(null);
    try {
      const { branch } = await api.createBranch(callId, { branchIndex, position: 'before' });
      if (active.current) {
        await navigate(
          `/calls/${encodeURIComponent(callId)}/branch/${encodeURIComponent(branch.id)}`,
        );
      }
    } catch (error) {
      if (!active.current) return;
      setBranchError(
        error instanceof ApiError && (error.status === 400 || error.status === 404)
          ? 'This response is no longer available. Reload the call and try again.'
          : error instanceof Error
            ? error.message
            : 'Could not create a practice branch.',
      );
    } finally {
      if (active.current) setBranchingMessageId(null);
    }
  }

  const sentimentMap = useMemo(() => {
    const scores = new Map<string, SentimentScore>();
    for (const { messageId, result } of sentiments) {
      if (result.ok) scores.set(messageId, result.sentiment);
    }
    return scores;
  }, [sentiments]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [details, transcript] = await Promise.all([
          api.getCall(callId, controller.signal),
          api.getCallMessages(callId, controller.signal),
        ]);
        if ('error' in details) throw new Error(details.error.message);
        if (controller.signal.aborted) return;
        setCall(details.call);
        setMessages(transcript.messages);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load this call.');
      }
    }
    void load();
    return () => controller.abort();
  }, [callId]);

  useEffect(() => {
    if (messages.length === 0) return;

    const controller = new AbortController();
    async function load() {
      try {
        const response = await api.getCallSentiment(callId, controller.signal);
        if ('error' in response) {
          throw new Error(response.error.message);
        }
        const sentiments = response.messageSentiments;

        if (controller.signal.aborted) return;
        setSentiments(sentiments);
        setSentimentError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSentimentError(
          error instanceof ApiError && error.status === 503
            ? 'Sentiment analysis is unavailable.'
            : error instanceof Error
              ? error.message
              : 'Could not load sentiment.',
        );
      }
    }
    void load();
    return () => controller.abort();
  }, [callId, messages]);

  return (
    <main className="min-h-screen w-full">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/calls" className="text-sm font-medium underline">
          ← All calls
        </Link>
        {loadError && (
          <p role="alert" className="mt-4">
            {loadError}
          </p>
        )}
        {!call && !loadError && (
          <p role="status" className="mt-4">
            Loading call…
          </p>
        )}
        {call && (
          <>
            <header className="my-5">
              <p className="text-sm text-secondary">Original call</p>
              <h1 className="mt-1 text-3xl font-semibold">{call.topic}</h1>
              <p className="mt-2 text-secondary">
                {call.customerName} ·{' '}
                <time dateTime={call.createdAt}>{new Date(call.createdAt).toLocaleString()}</time>
              </p>
            </header>
            {streamError && (
              <p role="status" className="mb-3 text-secondary">
                {streamError}
              </p>
            )}
            {sentimentError && (
              <p role="status" className="mb-3 text-secondary">
                {sentimentError}
              </p>
            )}
            {branchError && (
              <p role="alert" className="mb-3">
                {branchError}
              </p>
            )}
            {messages.length === 0 ? (
              <p className="rounded-lg border border-tertiary bg-card p-6">
                No messages were saved for this call.
              </p>
            ) : (
              <Conversation
                messages={messages}
                sentimentMap={sentimentMap}
                title="Conversation"
                onBranch={startBranch}
                branchingMessageId={branchingMessageId}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
