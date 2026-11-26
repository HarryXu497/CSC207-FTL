import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Branch, Message, SentimentScore } from '@recall/server/entities';
import { api, type AccuracyResponse } from './api';
import Conversation from './components/Conversation';
import NavBar from './components/NavBar';
import PracticeReplyForm from './components/PracticeReplyForm';
import PracticeBranches from './components/PracticeBranches';
import PracticeSentimentPanel from './components/PracticeSentimentPanel';
import PracticeAccuracyPanel from './components/PracticeAccuracyPanel';
import { useMessageStream } from './useMessageStream';
import { useStoredBranchAnalysis } from './useStoredBranchAnalysis';

const sentimentClient = {
  label: 'Sentiment',
  read: api.getBranchSentiment,
  analyze: api.analyzeBranchSentiment,
};

const accuracyClient = {
  label: 'Accuracy',
  read: api.getBranchAccuracy,
  analyze: api.analyzeBranchAccuracy,
  getRevision: ({ accuracy }: AccuracyResponse) =>
    accuracy.messageIds ? JSON.stringify(accuracy.messageIds) : null,
};

export default function BranchAnalysisPage() {
  const { callId, branchId } = useParams();
  return callId && branchId ? (
    <BranchDetails key={`${callId}/${branchId}`} callId={callId} branchId={branchId} />
  ) : (
    <p role="alert">Practice branch not found.</p>
  );
}

function BranchDetails({ callId, branchId }: { callId: string; branchId: string }) {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sentiment = useStoredBranchAnalysis(callId, branchId, branch !== null, sentimentClient);
  const revision = JSON.stringify(messages.map((message) => message.id));
  const accuracy = useStoredBranchAnalysis(
    callId,
    branchId,
    branch !== null,
    accuracyClient,
    revision,
  );
  const sentimentMap = useMemo(() => {
    const currentIds = new Set(messages.map((message) => message.id));
    const scores = new Map<string, SentimentScore>();
    for (const { messageId, result } of sentiment.data?.messageSentiments ?? []) {
      if (currentIds.has(messageId) && result.ok) scores.set(messageId, result.sentiment);
    }
    return scores;
  }, [messages, sentiment.data]);
  // HTTP responses and the stream may deliver the same message; merge them by saved ID.
  function includeSavedMessages(saved: Message[]) {
    setMessages((current) => {
      const combined = new Map(current.map((message) => [message.id, message]));
      for (const message of saved) combined.set(message.id, message);
      return [...combined.values()].sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
    });
  }
  const streamError = useMessageStream({
    callId,
    branchId,
    enabled: branch !== null,
    onMessages: setMessages,
  });

  // Load branch metadata and its transcript together before enabling the message stream.
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [details, transcript] = await Promise.all([
          api.getBranch(callId, branchId, controller.signal),
          api.getBranchMessages(callId, branchId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setBranch(details.branch);
        setMessages(transcript.messages);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'Could not load this practice branch.');
      }
    }
    void load();
    return () => controller.abort();
  }, [callId, branchId]);

  return (
    <main className="min-h-screen w-full">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link to={`/calls/${encodeURIComponent(callId)}`} className="text-sm font-medium underline">
          ← Original call
        </Link>
        {error && (
          <p role="alert" className="mt-4">
            {error}
          </p>
        )}
        {!branch && !error && (
          <p role="status" className="mt-4">
            Loading practice branch…
          </p>
        )}
        {branch && (
          <>
            <header className="my-5">
              <p className="text-sm text-secondary">Practice branch</p>
              <h1 className="mt-1 text-3xl font-semibold">{branch.topic}</h1>
              <p className="mt-2 text-secondary">
                {branch.customerName} · Created{' '}
                <time dateTime={branch.createdAt}>
                  {new Date(branch.createdAt).toLocaleString()}
                </time>
              </p>
              <p className="mt-1 text-sm text-secondary">
                Started at message {branch.branchIndex + 1}
              </p>
            </header>
            <details className="my-4 rounded-lg border border-tertiary bg-card p-4">
              <summary className="cursor-pointer font-medium">Switch practice branch</summary>
              <PracticeBranches callId={callId} currentBranchId={branchId} />
            </details>
            {streamError && (
              <p role="status" className="mb-3 text-secondary">
                {streamError}
              </p>
            )}
            <div className="mb-4 grid items-start gap-4 md:grid-cols-2">
              <PracticeSentimentPanel messages={messages} analysis={sentiment} />
              <PracticeAccuracyPanel messages={messages} revision={revision} analysis={accuracy} />
            </div>
            <Conversation
              messages={messages}
              sentimentMap={sentimentMap}
              title="Practice conversation"
              className="h-auto max-h-[60vh]"
              followLatest
              contextMessageCount={branch.branchIndex}
            />
            <PracticeReplyForm
              callId={callId}
              branchId={branchId}
              lastMessage={messages.at(-1)}
              onSaved={(message) => includeSavedMessages([message])}
              onRefreshed={includeSavedMessages}
            />
          </>
        )}
      </div>
    </main>
  );
}
