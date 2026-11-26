import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Branch } from '@recall/server/entities';
import { api } from '../api';

interface PracticeBranchesProps {
  callId: string;
  currentBranchId?: string;
}

export default function PracticeBranches({ callId, currentBranchId }: PracticeBranchesProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { branches } = await api.listBranches(callId, controller.signal);
        if (controller.signal.aborted) return;
        setBranches(
          [...branches].sort(
            (left, right) =>
              right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id),
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'Could not load practice branches.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [callId, attempt]);

  function refresh() {
    setError(null);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  return (
    <section aria-labelledby="practice-branches-heading" className="my-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="practice-branches-heading" className="text-xl font-semibold">
          Saved practice branches
        </h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="text-sm font-medium underline disabled:opacity-50"
        >
          Refresh branches
        </button>
      </div>
      {loading && <p role="status">Loading practice branches…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && branches.length === 0 && (
        <p className="text-secondary">
          No practice branches yet. Choose an agent reply below to try a different response.
        </p>
      )}
      {!loading && !error && branches.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <li key={branch.id}>
              <Link
                to={`/calls/${encodeURIComponent(callId)}/branch/${encodeURIComponent(branch.id)}`}
                aria-current={branch.id === currentBranchId ? 'page' : undefined}
                className={`block rounded-lg border bg-card p-4 hover:border-accent-blue focus-visible:outline-2 focus-visible:outline-accent-blue ${branch.id === currentBranchId ? 'border-accent-blue' : 'border-tertiary'}`}
              >
                <span className="font-medium">Practice from message {branch.branchIndex + 1}</span>
                <time dateTime={branch.createdAt} className="mt-1 block text-sm text-secondary">
                  {new Date(branch.createdAt).toLocaleString()}
                </time>
                <span className="mt-2 block text-sm text-score-ok">
                  {branch.id === currentBranchId ? 'Current practice' : 'Open practice →'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
