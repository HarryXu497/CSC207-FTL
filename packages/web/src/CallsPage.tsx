import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Call } from '@recall/server/entities';
import { api } from './api';
import NavBar from './components/NavBar';

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await api.listCalls(controller.signal);
        if ('error' in response) throw new Error(response.error.message);
        if (controller.signal.aborted) return;
        setCalls(response.calls);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'Could not load calls.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  return (
    <main className="min-h-screen w-full">
      <NavBar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Calls</h1>
            <p className="mt-2 text-secondary">
              Choose a call to review its conversation and practice a new response.
            </p>
          </div>
          <Link
            to="/calls/new"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-inverse"
          >
            Import call
          </Link>
        </header>

        {loading && <p role="status">Loading calls…</p>}
        {error && (
          <div role="alert" className="rounded-lg border border-accent-red bg-card p-4">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        )}
        {!loading && !error && calls.length === 0 && (
          <p className="rounded-lg border border-tertiary bg-card p-6">
            No calls yet. Import a conversation to get started.
          </p>
        )}
        {!loading && !error && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {calls.map((call) => (
              <li key={call.id}>
                <Link
                  to={`/calls/${encodeURIComponent(call.id)}`}
                  className="block rounded-lg border-2 border-tertiary bg-card p-5 transition-colors hover:border-accent-blue focus-visible:outline-2 focus-visible:outline-accent-blue"
                >
                  <h2 className="text-lg font-semibold">{call.topic}</h2>
                  <p className="mt-2">{call.customerName}</p>
                  <time dateTime={call.createdAt} className="mt-1 block text-sm text-secondary">
                    {new Date(call.createdAt).toLocaleString()}
                  </time>
                  <span className="mt-4 block text-sm font-medium text-score-ok">
                    Open conversation →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
