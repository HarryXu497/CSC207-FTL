import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Message } from '@recall/server/entities';
import { api } from '../api';

interface PracticeReplyFormProps {
  callId: string;
  branchId: string;
  onSaved: (message: Message) => void;
}

export default function PracticeReplyForm({ callId, branchId, onSaved }: PracticeReplyFormProps) {
  const active = useRef(false);
  const submitting = useRef(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const { message } = await api.postBranchMessage(callId, branchId, {
        role: 'agent',
        content,
      });
      if (!active.current) return;
      onSaved(message);
      setDraft('');
    } catch (error) {
      if (!active.current) return;
      setError(error instanceof Error ? error.message : 'Could not save your reply. Try again.');
    } finally {
      submitting.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-tertiary bg-card p-4">
      <label htmlFor="practice-reply" className="block font-semibold">
        Your reply
      </label>
      <textarea
        id="practice-reply"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={saving}
        required
        rows={3}
        placeholder="Write your response as the agent…"
        className="mt-2 w-full rounded border border-tertiary p-3 disabled:opacity-60"
      />
      {error && (
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving || !draft.trim()}
        className="mt-3 rounded bg-primary px-4 py-2 text-inverse disabled:opacity-50"
      >
        {saving ? 'Saving reply…' : 'Save reply'}
      </button>
    </form>
  );
}
