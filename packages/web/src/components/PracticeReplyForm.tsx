import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Message } from '@recall/server/entities';
import { api, ApiError } from '../api';

interface PracticeReplyFormProps {
  callId: string;
  branchId: string;
  lastMessage?: Message;
  onSaved: (message: Message) => void;
  onRefreshed: (messages: Message[]) => void;
}

export default function PracticeReplyForm({
  callId,
  branchId,
  lastMessage,
  onSaved,
  onRefreshed,
}: PracticeReplyFormProps) {
  const active = useRef(false);
  const submitting = useRef(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; agentId?: string } | null>(null);
  const pendingAgentId = lastMessage?.role === 'agent' ? lastMessage.id : null;
  const busy = saving || generating || refreshing;
  const visibleError =
    error && (!error.agentId || error.agentId === pendingAgentId || needsRefresh)
      ? error.message
      : null;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function refreshHistory() {
    setRefreshing(true);
    try {
      const { messages } = await api.getBranchMessages(callId, branchId);
      if (!active.current) return null;
      onRefreshed(messages);
      setNeedsRefresh(false);
      return messages;
    } catch {
      if (active.current) {
        setNeedsRefresh(true);
        setError({
          message: 'Could not check the saved conversation. Reload it before continuing.',
        });
      }
      return null;
    } finally {
      if (active.current) setRefreshing(false);
    }
  }

  async function generateReply(agentId: string) {
    setGenerating(true);
    try {
      const { message } = await api.simulateMessage(callId, branchId, {
        expectedLastMessageId: agentId,
      });
      if (active.current) onSaved(message);
    } catch (error) {
      if (!active.current) return;
      const history = await refreshHistory();
      if (!history) return;
      if ((error instanceof ApiError && error.status === 409) || history.at(-1)?.id !== agentId) {
        setNotice('The conversation changed. The latest messages have been loaded.');
      } else {
        setError({
          agentId,
          message:
            error instanceof ApiError && error.status === 503
              ? 'Customer replies are unavailable right now. Your reply is saved.'
              : 'Your reply is saved. Could not get the customer reply. Try again.',
        });
      }
    } finally {
      if (active.current) setGenerating(false);
    }
  }

  async function retryReply(reloadOnly = false) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setNotice(null);
    try {
      const history = await refreshHistory();
      if (!history) return;
      const latest = history.at(-1);
      if (!reloadOnly && latest?.role === 'agent' && latest.id === pendingAgentId) {
        await generateReply(latest.id);
      } else {
        setNotice('The latest messages have been loaded.');
      }
    } finally {
      submitting.current = false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pendingAgentId || needsRefresh || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { message } = await api.postBranchMessage(callId, branchId, {
        role: 'agent',
        content,
      });
      if (!active.current) return;
      onSaved(message);
      setDraft('');
      setSaving(false);
      await generateReply(message.id);
    } catch (error) {
      if (!active.current) return;
      if (!(error instanceof ApiError)) {
        const history = await refreshHistory();
        if (!history) return;
        const latest = history.at(-1);
        if (
          latest?.role === 'agent' &&
          latest.id !== lastMessage?.id &&
          latest.content === content
        ) {
          setDraft('');
          setNotice('Your reply is saved. Get the customer reply to continue.');
          return;
        }
      }
      if (!active.current) return;
      setError({
        message: error instanceof Error ? error.message : 'Could not save your reply. Try again.',
      });
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
        disabled={busy || needsRefresh || pendingAgentId !== null}
        required
        rows={3}
        placeholder="Write your response as the agent…"
        className="mt-2 w-full rounded border border-tertiary p-3 disabled:opacity-60"
      />
      {refreshing ? (
        <p role="status" className="mt-2 text-secondary">
          Checking the saved conversation…
        </p>
      ) : generating ? (
        <p role="status" className="mt-2 text-secondary">
          Waiting for the customer reply…
        </p>
      ) : pendingAgentId ? (
        <p role="status" className="mt-2 text-secondary">
          Your last reply is saved. Get the customer reply to continue.
        </p>
      ) : null}
      {notice && (
        <p role="status" className="mt-2 text-secondary">
          {notice}
        </p>
      )}
      {visibleError && (
        <p role="alert" className="mt-2">
          {visibleError}
        </p>
      )}
      {needsRefresh ? (
        <button
          type="button"
          onClick={() => void retryReply(true)}
          disabled={busy}
          className="mt-3 rounded bg-primary px-4 py-2 text-inverse disabled:opacity-50"
        >
          Reload conversation
        </button>
      ) : pendingAgentId ? (
        <button
          type="button"
          onClick={() => void retryReply()}
          disabled={busy}
          className="mt-3 rounded bg-primary px-4 py-2 text-inverse disabled:opacity-50"
        >
          {visibleError ? 'Retry customer reply' : 'Get customer reply'}
        </button>
      ) : (
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="mt-3 rounded bg-primary px-4 py-2 text-inverse disabled:opacity-50"
        >
          {saving ? 'Saving reply…' : 'Send reply'}
        </button>
      )}
    </form>
  );
}
