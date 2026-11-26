import type { Message } from '@recall/server/entities';
import type { ListCallSentimentsOutputData } from '@recall/server/service';
import type { StoredBranchAnalysis } from '../useStoredBranchAnalysis';
import Score from './Score';
import SentimentTrend from './SentimentTrend';

interface PracticeSentimentPanelProps {
  messages: Message[];
  analysis: StoredBranchAnalysis<ListCallSentimentsOutputData>;
}

export default function PracticeSentimentPanel({
  messages,
  analysis,
}: PracticeSentimentPanelProps) {
  const results = new Map(
    analysis.data?.messageSentiments.map((item) => [item.messageId, item.result]),
  );
  const covered = messages.filter((message) => results.has(message.id));
  const failed = covered.filter((message) => !results.get(message.id)?.ok).length;
  const latestCustomer = [...messages].reverse().find((message) => message.role === 'customer');
  const latestResult = latestCustomer ? results.get(latestCustomer.id) : undefined;

  return (
    <section
      aria-labelledby="practice-sentiment-heading"
      className="rounded-lg border border-tertiary bg-card p-4"
    >
      <h2 id="practice-sentiment-heading" className="text-xl font-semibold">
        Practice sentiment
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Scores range from −1 (negative) to +1 (positive).
      </p>
      {analysis.loading && (
        <p role="status" className="mt-3">
          Loading saved sentiment…
        </p>
      )}
      {!analysis.loading && messages.length === 0 && (
        <p className="mt-3">Add messages before analyzing this practice.</p>
      )}
      {!analysis.loading && messages.length > 0 && !analysis.data && (
        <p className="mt-3">No saved sentiment yet.</p>
      )}
      {analysis.data && (
        <div className="mt-3">
          <p>
            Analyzed {covered.length} of {messages.length} messages.
          </p>
          {covered.length < messages.length && <p className="mt-1">New messages need analysis.</p>}
          {failed > 0 && (
            <p className="mt-1">
              {failed} {failed === 1 ? 'message' : 'messages'} could not be scored.
            </p>
          )}
          {latestResult?.ok && (
            <div className="mt-3">
              <p className="text-sm">Latest customer sentiment</p>
              <Score score={latestResult.sentiment.score} sentimentScale />
            </div>
          )}
          <SentimentTrend messages={messages} results={analysis.data.messageSentiments} />
        </div>
      )}
      {analysis.error && (
        <p role="alert" className="mt-3">
          {analysis.error}
        </p>
      )}
      {analysis.analyzing && (
        <p role="status" className="mt-3">
          Analyzing practice sentiment…
        </p>
      )}
      <button
        type="button"
        onClick={() => void analysis.analyze()}
        disabled={analysis.loading || analysis.analyzing || messages.length === 0}
        className="mt-3 rounded border border-tertiary px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        Analyze sentiment
      </button>
    </section>
  );
}
