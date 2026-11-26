import { useId } from 'react';
import type { Message, MessageSentiment } from '@recall/server/entities';
import { messageAnchorHref } from '../messageLinks';

interface SentimentTrendProps {
  messages: Message[];
  results: MessageSentiment[];
}

const series = [
  { role: 'agent', label: 'Agent', color: 'var(--color-accent-blue)' },
  { role: 'customer', label: 'Customer', color: 'var(--color-score-weak)' },
] as const;

export default function SentimentTrend({ messages, results }: SentimentTrendProps) {
  const titleId = useId();
  const byId = new Map(results.map((item) => [item.messageId, item.result]));
  // Keep missing or failed scores as gaps in the transcript's message order.
  const points = messages.map((message, index) => {
    const result = byId.get(message.id);
    const score = result?.ok ? result.sentiment.score : undefined;
    return {
      message,
      number: index + 1,
      score:
        score !== undefined && Number.isFinite(score) && score >= -1 && score <= 1 ? score : null,
      x: messages.length === 1 ? 190 : 42 + (index * 296) / (messages.length - 1),
    };
  });
  const scored = points.filter((point) => point.score !== null);
  if (scored.length === 0) return <p className="mt-3 text-sm">No scored messages to plot yet.</p>;

  const y = (score: number) => 16 + (1 - score) * 60;

  return (
    <figure className="mt-4">
      <figcaption id={titleId} className="text-sm font-medium">
        Sentiment by message
      </figcaption>
      <div className="mt-2 flex gap-4 text-xs">
        {series.map(({ role, label, color }) => (
          <span key={role} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 360 168" role="group" aria-labelledby={titleId} className="mt-2 w-full">
        <desc>
          Sentiment scores from negative one to positive one, in transcript order. Unscored messages
          leave gaps.
        </desc>
        {[-1, 0, 1].map((score) => (
          <g key={score}>
            <line
              x1="42"
              x2="338"
              y1={y(score)}
              y2={y(score)}
              stroke="var(--color-tertiary)"
              strokeDasharray={score === 0 ? undefined : '3 3'}
            />
            <text x="32" y={y(score) + 4} textAnchor="end" fontSize="11" fill="currentColor">
              {score > 0 ? '+1' : score}
            </text>
          </g>
        ))}
        {series.map(({ role, color }) => {
          // Track each speaker separately; an unscored point breaks that speaker's line.
          let previous: (typeof points)[number] | null = null;
          return (
            <g key={role} stroke={color} fill={color}>
              {points
                .filter((point) => point.message.role === role)
                .map((point) => {
                  const before = previous;
                  previous = point.score === null ? null : point;
                  if (point.score === null) return null;
                  return (
                    <g key={point.message.id}>
                      {before && before.score !== null && (
                        <line
                          x1={before.x}
                          y1={y(before.score)}
                          x2={point.x}
                          y2={y(point.score)}
                          strokeWidth="2"
                        />
                      )}
                      <a
                        href={messageAnchorHref(point.message.id)}
                        aria-label={`Go to message ${point.number}, ${role}, sentiment ${point.score.toFixed(3)}`}
                        className="focus-visible:outline-2 focus-visible:outline-accent-blue"
                      >
                        <circle
                          cx={point.x}
                          cy={y(point.score)}
                          r="12"
                          fill="transparent"
                          stroke="none"
                        />
                        <circle cx={point.x} cy={y(point.score)} r="4">
                          <title>
                            Message {point.number}, {role}: {point.score.toFixed(3)}
                          </title>
                        </circle>
                      </a>
                    </g>
                  );
                })}
            </g>
          );
        })}
        {messages.length > 1 && (
          <text x="42" y="156" fontSize="11" fill="currentColor">
            1
          </text>
        )}
        <text x="190" y="156" textAnchor="middle" fontSize="11" fill="currentColor">
          {messages.length === 1 ? 'Message 1' : 'Message'}
        </text>
        {messages.length > 1 && (
          <text x="338" y="156" textAnchor="end" fontSize="11" fill="currentColor">
            {messages.length}
          </text>
        )}
      </svg>
      <p className="text-xs text-secondary">
        Select a point to view its message. Unscored messages leave gaps.
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer">View sentiment values</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th scope="col">Message</th>
              <th scope="col">Speaker</th>
              <th scope="col">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((point) => (
              <tr key={point.message.id}>
                <td>
                  <a
                    href={messageAnchorHref(point.message.id)}
                    aria-label={`Go to message ${point.number}`}
                    className="underline"
                  >
                    {point.number}
                  </a>
                </td>
                <td>{point.message.role}</td>
                <td>{point.score?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
