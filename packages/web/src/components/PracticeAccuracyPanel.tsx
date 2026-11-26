import type { AccuracyVerdict, Message } from '@recall/server/entities';
import type { AccuracyResponse } from '../api';
import type { StoredBranchAnalysis } from '../useStoredBranchAnalysis';
import { messageAnchorHref } from '../messageLinks';

const verdictLabels: Record<AccuracyVerdict, string> = {
  supported: 'Supported',
  contradicted: 'Contradicted',
  unsupported: 'Unsupported',
  not_verifiable: 'Not verifiable',
};

interface PracticeAccuracyPanelProps {
  messages: Message[];
  revision: string;
  analysis: StoredBranchAnalysis<AccuracyResponse>;
}

export default function PracticeAccuracyPanel({
  messages,
  revision,
  analysis,
}: PracticeAccuracyPanelProps) {
  const accuracy = analysis.data?.accuracy;
  const messageCount = messages.length;
  const messagesById = new Map(
    messages.map((message, index) => [message.id, { message, number: index + 1 }]),
  );

  return (
    <section
      aria-labelledby="practice-accuracy-heading"
      className="rounded-lg border border-tertiary bg-card p-4"
    >
      <h2 id="practice-accuracy-heading" className="text-xl font-semibold">
        Practice accuracy
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Checks the agent’s claims against company documents.
      </p>
      {analysis.loading && (
        <p role="status" className="mt-3">
          Loading saved accuracy…
        </p>
      )}
      {!analysis.loading && messageCount === 0 && (
        <p className="mt-3">Add messages before analyzing this practice.</p>
      )}
      {!analysis.loading && messageCount > 0 && !accuracy && (
        <p className="mt-3">No saved accuracy yet.</p>
      )}
      {accuracy && (
        <div className="mt-3">
          <p className="text-sm">Saved accuracy</p>
          <p className="mt-1 text-3xl font-semibold">
            {accuracy.score === null
              ? 'No checkable claims'
              : `${Math.round(accuracy.score)} / 100`}
          </p>
          <p className="mt-2 text-sm text-secondary">
            Analyzed{' '}
            <time dateTime={accuracy.analyzedAt}>
              {new Date(accuracy.analyzedAt).toLocaleString()}
            </time>
          </p>
          {analysis.analyzedRevision === null ? (
            <p className="mt-2 text-sm">Saved result; newer messages may not be included.</p>
          ) : analysis.analyzedRevision !== revision ? (
            <p role="status" className="mt-2 text-sm">
              New messages need accuracy analysis.
            </p>
          ) : null}
          <p className="mt-3 text-sm">
            {accuracy.counts.supported} supported · {accuracy.counts.contradicted} contradicted ·{' '}
            {accuracy.counts.unsupported} unsupported · {accuracy.counts.not_verifiable} not
            verifiable
          </p>
          {accuracy.claimsTruncated && (
            <p className="mt-2 text-sm">
              Some claims were not analyzed because the claim limit was reached.
            </p>
          )}
          {accuracy.claims.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer font-medium">
                Claim feedback ({accuracy.claims.length})
              </summary>
              <ul className="mt-3 space-y-4">
                {accuracy.claims.map((claim, index) => {
                  const source = claim.messageId ? messagesById.get(claim.messageId) : undefined;
                  return (
                    <li
                      key={`${claim.messageId ?? 'unavailable'}/${index}`}
                      className="border-t border-tertiary pt-3"
                    >
                      <h3 className="text-sm font-semibold">
                        {source?.message.role === 'agent' ? (
                          <a
                            href={messageAnchorHref(source.message.id)}
                            aria-label={`Go to agent message ${source.number}`}
                            className="underline"
                          >
                            Agent message {source.number}
                          </a>
                        ) : (
                          'Source message unavailable'
                        )}{' '}
                        · {verdictLabels[claim.verdict]}
                      </h3>
                      <p className="mt-1 font-medium">{claim.text}</p>
                      <p className="mt-1 text-sm">{claim.explanation}</p>
                      {claim.evidence ? (
                        <figure className="mt-2 border-l-2 border-tertiary pl-3 text-sm">
                          <blockquote>{claim.evidence.quote}</blockquote>
                          <figcaption className="mt-1 text-secondary">
                            {claim.evidence.source}
                          </figcaption>
                        </figure>
                      ) : (
                        <p className="mt-2 text-sm text-secondary">
                          No document evidence was cited.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>
      )}
      {analysis.error && (
        <p role="alert" className="mt-3">
          {analysis.error}
        </p>
      )}
      {analysis.analyzing && (
        <p role="status" className="mt-3">
          Analyzing practice accuracy…
        </p>
      )}
      <button
        type="button"
        onClick={() => void analysis.analyze()}
        disabled={analysis.loading || analysis.analyzing || messageCount === 0}
        className="mt-3 rounded border border-tertiary px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        Analyze accuracy
      </button>
    </section>
  );
}
