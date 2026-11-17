import { useEffect, useState } from 'react';
import { api } from './api';
import type { Call } from '@recall/server/entities';

export default function App() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState('50');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { calls } = await api.listCalls();
        setCalls(calls);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Could not reach the API on port 4000.',
        );
      }
    }

    // Deliberately not await this call
    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setSaveError(null);
    try {
      const { call } = await api.createCall({
        customerName,
        topic,
      });

      setCalls([call, ...calls]);

      setCustomerName('');
      setTopic('');
      setScore('50');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit = customerName.trim() !== '' && topic.trim() !== '' && !isSaving;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">ReCall</h1>
      <p className="mt-1 text-sm text-slate-600">Minimal proof of concept</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Log a call</h2>

        <label className="block">
          <span className="text-sm font-medium">Customer name</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            placeholder="Priya Raman"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            placeholder="Damaged delivery"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Score (0-100)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-1 w-24 rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>

        {saveError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isSaving ? 'Saving...' : 'Save call'}
        </button>
      </form>

      <h2 className="mt-8 font-semibold">Stored calls ({calls.length})</h2>

      {loadError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {loadError} Start both servers with <code>npm run dev</code>.
        </p>
      )}

      <ul className="mt-2 space-y-2">
        {calls.map((call) => (
          <li
            key={call.id}
            className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
          >
            <div>
              <p className="font-medium">{call.customerName}</p>
              <p className="text-sm text-slate-600">{call.topic}</p>
              <p className="text-xs text-slate-400">{new Date(call.createdAt).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
