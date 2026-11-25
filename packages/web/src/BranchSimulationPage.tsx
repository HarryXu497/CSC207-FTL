import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import type { Accuracy, Call, Message, TranscriptMessage } from '@recall/server/entities';
import { api } from './api';
import BranchAccuracy from './components/BranchAccuracy';

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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(date)
    .replace(' ', '')
    .toLowerCase();

  return `${datePart} - ${timePart}`;
}

type BranchTimelineProps = {
  call: Call;
  messages: Message[];
  branchIndex: number;
};

function BranchTimeline({ call, messages, branchIndex }: BranchTimelineProps) {
  const timelineStart = messages[0]?.createdAt ?? call.createdAt;
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
        aria-label={`The main call timeline branches after message ${branchIndex + 1}`}
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
                fill={index <= branchIndex ? '#4b5563' : '#8b8d92'}
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
          branch 1
        </text>
      </svg>
    </div>
  );
}

type CallData = { call: Call; messages: Message[] };
type CallLoad = CallData | { error: string } | null;

function LoadedBranchSimulation({ callId }: { callId: string }) {
  const [data, setData] = useState<CallLoad>(null);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadCall() {
      try {
        const [callResponse, messageResponse] = await Promise.all([
          api.getCall(callId, signal),
          api.listCallMessages(callId, signal),
        ]);

        if ('error' in callResponse) throw new Error(callResponse.error.message);
        if ('error' in messageResponse) throw new Error(messageResponse.error.message);
        if (signal.aborted) return;
        setData({ call: callResponse.call, messages: messageResponse.messages });
      } catch (error) {
        if (signal.aborted) return;
        setData({ error: error instanceof Error ? error.message : 'Could not load the call.' });
      }
    }

    void loadCall();
    return () => controller.abort();
  }, [callId]);

  if (data && 'call' in data && data.messages.length > 0) return <Simulation {...data} />;

  return (
    <main className="min-h-screen bg-white px-6 py-8 sm:px-11 sm:py-10">
      {data && 'error' in data ? (
        <p role="alert">{data.error}</p>
      ) : data ? (
        <>
          <h1 className="text-3xl font-bold">{data.call.topic}</h1>
          <p className="mt-2">This call needs a transcript before you can simulate a branch.</p>
          <Link to="/calls/new" className="mt-3 inline-block text-[#6046dc] underline">
            Upload a call transcript
          </Link>
        </>
      ) : (
        <p role="status">Loading call…</p>
      )}
    </main>
  );
}

export default function BranchSimulationPage() {
  const { callId } = useParams();
  return callId ? <LoadedBranchSimulation key={callId} callId={callId} /> : null;
}

type Turn = { agent: string; customer: string; sources: string[] };
type AccuracyResult = { accuracy: Accuracy } | { error: string } | 'loading' | null;

function Simulation({ call, messages }: CallData) {
  const [branchIndex, setBranchIndex] = useState(() => {
    const lastCustomer = messages.findLastIndex((message) => message.role === 'customer');
    return lastCustomer >= 0 ? lastCustomer : messages.length - 1;
  });
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [accuracyResult, setAccuracyResult] = useState<AccuracyResult>(null);
  const conversation = messages.slice(0, branchIndex + 1);
  const timelineStart = messages[0]?.createdAt ?? call.createdAt;
  const modifiedAt = messages.reduce(
    (latest, message) =>
      Date.parse(message.createdAt) > Date.parse(latest) ? message.createdAt : latest,
    call.createdAt,
  );
  const working = sending || accuracyResult === 'loading';
  const transcript: TranscriptMessage[] = conversation.map(({ role, content }) => ({
    role,
    content,
  }));
  for (const turn of turns) {
    transcript.push(
      { role: 'agent', content: turn.agent },
      { role: 'customer', content: turn.customer },
    );
  }

  async function analyze(messages: TranscriptMessage[]) {
    setAccuracyResult('loading');
    try {
      const result = await api.analyzeAccuracy({ topic: call.topic, messages });
      setAccuracyResult({ accuracy: result.accuracy });
    } catch (error) {
      setAccuracyResult({
        error: error instanceof Error ? error.message : 'Could not check accuracy.',
      });
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || working) return;

    setSending(true);
    setSimulationError(null);
    const messages: TranscriptMessage[] = [...transcript, { role: 'agent', content }];
    try {
      const result = await api.simulateReply({ topic: call.topic, messages });
      setTurns([
        ...turns,
        { agent: content, customer: result.reply.content, sources: result.sources },
      ]);
      setDraft('');
      await analyze([...messages, result.reply]);
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : 'Could not simulate a reply.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-white px-6 py-8 text-[#2e2e2e] sm:px-11 sm:py-10">
      <section aria-labelledby="branch-title">
        <h1 id="branch-title" className="text-3xl font-bold tracking-tight sm:text-5xl">
          {call.topic} - Branch 1
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-16 gap-y-1 text-xl text-[#7b7c7e] sm:text-2xl">
          <p>{formatDateTime(call.createdAt)}</p>
          <p>modified {formatDateTime(modifiedAt)}</p>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="call-branch-title">
        <h2 id="call-branch-title" className="mb-1 text-2xl font-medium">
          Call Branch
        </h2>
        <BranchTimeline call={call} messages={messages} branchIndex={branchIndex} />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="branch-point">Branch after</label>
          <select
            id="branch-point"
            value={branchIndex}
            onChange={(event) => {
              setBranchIndex(Number(event.target.value));
              setSimulationError(null);
            }}
            disabled={working || turns.length > 0}
            className="max-w-full rounded-md border border-slate-300 bg-white px-2 py-1"
          >
            {messages.map((message, index) => (
              <option key={message.id} value={index}>
                {index + 1}. {elapsedTime(timelineStart, message.createdAt)} ·{' '}
                {message.role === 'customer' ? 'Customer' : 'Agent'}
              </option>
            ))}
          </select>
          {turns.length > 0 && (
            <button
              type="button"
              disabled={working}
              onClick={() => {
                setTurns([]);
                setDraft('');
                setAccuracyResult(null);
                setSimulationError(null);
              }}
              className="ml-1 text-[#6046dc] underline disabled:opacity-50"
            >
              Start over
            </button>
          )}
        </div>
      </section>

      <section className="mt-1" aria-labelledby="conversation-title">
        <h2 id="conversation-title" className="mb-5 text-2xl font-medium">
          Conversation
        </h2>

        <div className="space-y-7">
          {conversation.map((message) => {
            const isAgent = message.role === 'agent';
            return (
              <article key={message.id} className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm text-white ${isAgent ? 'bg-[#4ea0ed]' : 'bg-[#ff6b4f]'}`}
                >
                  {isAgent ? 'AG' : 'C'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-16">
                    <h3 className="font-medium">{isAgent ? 'Agent' : 'Customer'}</h3>
                    <time className="text-sm text-[#9a9ca1]">
                      {elapsedTime(timelineStart, message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[16px] leading-relaxed">{message.content}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="my-8 flex items-center gap-3 text-center">
        <span className="h-[3px] flex-1 bg-[#9237ad]" />
        <p className="text-[16px] font-medium sm:text-lg">Branched Here · Simulated Conversation</p>
        <span className="h-[3px] flex-1 bg-[#9237ad]" />
      </div>

      <div className="space-y-5" aria-live="polite">
        {turns.map((turn, index) => (
          <div key={index} className="space-y-3">
            <p className="whitespace-pre-wrap rounded-md bg-[#f5f2ff] px-4 py-3 text-sm">
              <strong className="mr-2 text-[#6046dc]">Agent</strong>
              {turn.agent}
            </p>
            <div className="rounded-md border border-slate-200 px-4 py-3 text-sm">
              <p className="whitespace-pre-wrap">
                <strong className="mr-2">Simulated customer</strong>
                {turn.customer}
              </p>
              <p className="mt-2 break-words text-xs text-slate-600">
                {turn.sources.length
                  ? `Knowledge base context: ${turn.sources.map((source) => source.split(/[\\/]/).at(-1)).join(', ')}`
                  : 'No knowledge base documents were retrieved for this reply.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void send(event)} className={turns.length ? 'mt-5' : undefined}>
        <div className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4ea0ed] text-xs text-white">
            AG
          </div>
          <div className="w-full">
            <label id="reply-title" htmlFor="branch-reply" className="text-sm text-[#6046dc]">
              Your new reply
            </label>
            <div className="relative mt-2">
              <textarea
                id="branch-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={working}
                maxLength={600}
                rows={3}
                className="w-full resize-none rounded-md border-2 border-[#7357ed] px-4 py-3 pr-20 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[#7357ed]/20"
              />
              <span className="absolute bottom-3 right-4 font-mono text-xs text-[#8c92ad]">
                {draft.length} / 600
              </span>
            </div>
            <button
              type="submit"
              disabled={!draft.trim() || working}
              className="mt-2 rounded-md bg-[#6850dc] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5840ca] focus:outline-none focus:ring-2 focus:ring-[#6850dc]/40 disabled:opacity-50"
            >
              {sending && accuracyResult !== 'loading' ? 'Simulating…' : 'Send & simulate reply'}
            </button>
          </div>
        </div>
        {simulationError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {simulationError}
          </p>
        )}
      </form>

      {accuracyResult === 'loading' && (
        <p role="status" className="mt-5 text-sm">
          Checking branch accuracy…
        </p>
      )}
      {accuracyResult &&
        accuracyResult !== 'loading' &&
        ('accuracy' in accuracyResult ? (
          <BranchAccuracy accuracy={accuracyResult.accuracy} />
        ) : (
          <div className="mt-5 text-sm">
            <p role="alert">{accuracyResult.error}</p>
            <button
              type="button"
              disabled={working}
              onClick={() => void analyze(transcript)}
              className="mt-2 text-[#6046dc] underline"
            >
              Retry accuracy check
            </button>
          </div>
        ))}
    </main>
  );
}
