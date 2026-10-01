/**
 * The whole user interface: a list read from the database, and a form that writes
 * to it.
 *
 * A React component is just a function that returns markup. The markup is JSX -
 * it looks like HTML but it is TypeScript, so `className` replaces `class`
 * (because `class` is a reserved word) and `{braces}` drop back into real
 * expressions.
 */
import { useEffect, useState } from 'react';
import type { Call } from '@recall/shared';
import { api } from './api';

export default function App() {
  /*
   * `useState` is React's "remember a value between renders". It returns the
   * current value and a setter; CALLING THE SETTER RE-RENDERS the component.
   *
   * The rule that catches everyone: never assign to the variable
   * (`calls = [...]` does nothing). Always call the setter, and always replace
   * state rather than mutating it - React decides whether to re-render by
   * comparing references, so `calls.push(x)` leaves the reference identical and
   * nothing happens on screen.
   */
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* Form fields. A `useState` per input. */
  const [customerName, setCustomerName] = useState('');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState('50');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /*
   * `useEffect` runs code AFTER the component renders - the right place for
   * anything that reaches outside React, like a network request. The `[]` second
   * argument is the dependency array: it means "run once, when this component
   * first appears". Omitting it entirely would re-run after EVERY render, which
   * is usually an infinite loop.
   */
  useEffect(() => {
    /* An effect may not itself be `async`, because React expects its return value
       to be a cleanup function, not a Promise. So define one inside and call it. */
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
    void load(); // `void` = "I am deliberately not awaiting this"
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    /* Without this the browser does a full page navigation on submit and the whole
       app reloads from scratch. Every React form needs this line. */
    event.preventDefault();

    setIsSaving(true);
    setSaveError(null);
    try {
      const { call } = await api.createCall({
        customerName,
        topic,
        /* An <input> value is ALWAYS a string, even with type="number". The server
           demands a real number, so convert here. */
        score: Number(score),
      });

      /* Put the new row at the top. A NEW array, not `calls.push(call)`. */
      setCalls([call, ...calls]);

      /* Clear the form only on success. */
      setCustomerName('');
      setTopic('');
      setScore('50');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      /* `finally` runs on both paths, so the button can never stay stuck on
         "Saving...". */
      setIsSaving(false);
    }
  }

  const canSubmit = customerName.trim() !== '' && topic.trim() !== '' && !isSaving;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">ReCall</h1>
      <p className="mt-1 text-sm text-slate-600">
        Minimal proof of concept: React talking to Express talking to a database.
      </p>

      {/* ---------- write to the database ---------- */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Log a call</h2>

        <label className="block">
          <span className="text-sm font-medium">Customer name</span>
          {/*
            A CONTROLLED INPUT: React state is the single source of truth and the
            input merely displays it. Supply `value` without `onChange` and the
            field becomes read-only - a confusing first-time React bug.
          */}
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
          /* role="alert" makes a screen reader announce this the moment it appears. */
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

      {/* ---------- read from the database ---------- */}
      <h2 className="mt-8 font-semibold">Stored calls ({calls.length})</h2>

      {loadError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {loadError} Start both servers with <code>npm run dev</code>.
        </p>
      )}

      <ul className="mt-2 space-y-2">
        {/*
          `.map()` turns an array of data into an array of markup - the equivalent
          of a list comprehension. `key` is REQUIRED and must be unique among
          siblings: it is how React tells items apart between renders.
        */}
        {calls.map((call) => (
          <li
            key={call.id}
            className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
          >
            <div>
              <p className="font-medium">{call.customerName}</p>
              <p className="text-sm text-slate-600">{call.topic}</p>
              {/* The server sends an ISO string; the browser formats it in the
                  reader's own locale and timezone. Never format dates on the
                  server - it has no idea where the reader is. */}
              <p className="text-xs text-slate-400">{new Date(call.handledAt).toLocaleString()}</p>
            </div>
            <span className="text-lg font-semibold tabular-nums">{call.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
