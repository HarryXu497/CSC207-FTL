import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Call, Message, SentimentScore } from '@recall/server/entities';
import { api } from './api';
import Conversation from './components/Conversation';

const nodeColors = [
  '#12c4e9',
  '#237bc0',
  '#9237ad',
  '#c594d5',
  '#b18ea8',
  '#bd8e98',
  '#c595d5',
  '#92a4cb',
];

function elapsedTime(start: string, current: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(current) - Date.parse(start)) / 1000));
  if (!Number.isFinite(seconds)) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

type BranchTimelineProps = {
  messages: Message[];
  branchIndex: number;
  timelineStart: string;
};

function BranchTimeline({ messages, branchIndex, timelineStart }: BranchTimelineProps) {
  const startX = 100;
  const gap = 105;
  const endX = startX + (messages.length - 1) * gap;
  const branchX = startX + branchIndex * gap;
  const branchEndX = branchX + gap;
  const width = Math.max(940, endX + gap, branchEndX + 28);

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${width} 150`}
        width={width}
        height="150"
        className="max-w-none"
        role="img"
        aria-label={`The main call timeline branches before message ${branchIndex + 1}`}
      >
        <rect x="10" y="36" width="55" height="28" rx="6" fill="#f0f2fa" />
        <text x="20" y="54" fill="#667085" fontSize="12" fontFamily="monospace">
          main
        </text>

        <path d={`M${startX} 52H${endX}`} stroke="#9aa9cb" strokeWidth="5" strokeLinecap="round" />
        <path
          d={`M${startX} 52H${branchX}`}
          stroke="#3b82d0"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={`M${branchX} 52C${branchX + 44} 52 ${branchX + 46} 118 ${branchEndX} 118`}
          stroke="#9237ad"
          strokeWidth="5"
          fill="none"
        />

        {messages.map((message, index) => {
          const x = startX + index * gap;
          const time = elapsedTime(timelineStart, message.createdAt);
          return (
            <g key={message.id}>
              <circle
                cx={x}
                cy="52"
                r="12"
                fill={index === branchIndex ? '#9237ad' : nodeColors[index % nodeColors.length]}
                stroke="white"
                strokeWidth="3"
              >
                <title>{time}</title>
              </circle>
              <text
                x={x}
                y="20"
                fill={index < branchIndex ? '#4b5563' : '#8b8d92'}
                fontSize="12"
                textAnchor="middle"
              >
                {time}
              </text>
            </g>
          );
        })}

        <circle cx={branchEndX} cy="118" r="12" fill="#9237ad" stroke="white" strokeWidth="3" />
        <rect x="10" y="103" width="76" height="28" rx="6" fill="#ddd1ff" />
        <text x="21" y="121" fill="#625b88" fontSize="12" fontFamily="monospace">
          practice
        </text>
      </svg>
    </div>
  );
}

const noSentiment = new Map<string, SentimentScore>();
type CallData = { call: Call; messages: Message[] };

export default function BranchSimulationPage() {
  const { callId } = useParams();
  return callId ? (
    <BranchPicker key={callId} callId={callId} />
  ) : (
    <p role="alert">Call not found.</p>
  );
}

function BranchPicker({ callId }: { callId: string }) {
  const [data, setData] = useState<CallData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const originalCallPath = `/calls/${encodeURIComponent(callId)}`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function load() {
      try {
        const [details, transcript] = await Promise.all([
          api.getCall(callId, signal),
          api.getCallMessages(callId, signal),
        ]);
        if ('error' in details) throw new Error(details.error.message);
        if (!signal.aborted) setData({ call: details.call, messages: transcript.messages });
      } catch (error) {
        if (!signal.aborted) {
          setError(error instanceof Error ? error.message : 'Could not load the call.');
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [callId]);

  return (
    <main className="min-h-screen w-full bg-white px-6 py-8 text-primary sm:px-11 sm:py-10">
      <Link to={originalCallPath} className="text-sm font-medium underline">
        ← Original call
      </Link>
      {error ? (
        <p role="alert" className="mt-4">
          {error}
        </p>
      ) : data ? (
        <>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{data.call.topic}</h1>
          {data.messages[0] ? (
            <BranchPointForm
              callId={callId}
              messages={data.messages}
              timelineStart={data.messages[0].createdAt}
            />
          ) : (
            <p className="mt-4">This call needs a transcript before you can simulate a branch.</p>
          )}
        </>
      ) : (
        <p role="status" className="mt-4">
          Loading call…
        </p>
      )}
    </main>
  );
}

function BranchPointForm({
  callId,
  messages,
  timelineStart,
}: {
  callId: string;
  messages: Message[];
  timelineStart: string;
}) {
  const navigate = useNavigate();
  const active = useRef(false);
  const requestPending = useRef(false);
  const [branchIndex, setBranchIndex] = useState(() => {
    const lastAgent = messages.findLastIndex((message) => message.role === 'agent');
    return lastAgent >= 0 ? lastAgent : 0;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = messages.slice(0, branchIndex);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function startBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    requestPending.current = true;
    setSaving(true);
    setError(null);
    try {
      const { branch } = await api.createBranch(callId, { branchIndex });
      if (active.current) {
        await navigate(
          `/calls/${encodeURIComponent(callId)}/branch/${encodeURIComponent(branch.id)}`,
        );
      }
    } catch (error) {
      if (active.current) {
        setError(error instanceof Error ? error.message : 'Could not create the practice branch.');
      }
    } finally {
      requestPending.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <section aria-labelledby="branch-point-heading" className="mt-6">
      <h2 id="branch-point-heading" className="mb-1 text-2xl font-medium">
        Call Branch
      </h2>
      <BranchTimeline messages={messages} branchIndex={branchIndex} timelineStart={timelineStart} />
      <form onSubmit={(event) => void startBranch(event)} className="my-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Message to replace
            <select
              value={branchIndex}
              onChange={(event) => setBranchIndex(Number(event.target.value))}
              disabled={saving}
              className="rounded-md border border-tertiary bg-white px-3 py-2"
            >
              {messages.map((message, index) => (
                <option key={message.id} value={index}>
                  {index + 1}. {elapsedTime(timelineStart, message.createdAt)} ·{' '}
                  {message.role === 'customer' ? 'Customer' : 'Agent'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#6850dc] px-4 py-2 text-sm font-medium text-white hover:bg-[#5840ca] disabled:opacity-50"
          >
            {saving ? 'Creating practice…' : 'Start practice'}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
      {prefix.length ? (
        <Conversation
          messages={prefix}
          sentimentMap={noSentiment}
          title="Conversation before the branch"
          className="h-auto max-h-[50vh]"
        />
      ) : (
        <p className="text-sm text-secondary">Practice starts with a blank conversation.</p>
      )}
    </section>
  );
}
