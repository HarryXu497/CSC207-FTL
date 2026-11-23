import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';
import NavBar from './components/NavBar';

export default function NewCallPage() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [topic, setTopic] = useState('');
  const [messagesString, setMessagesString] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    try {
      const response = await api.createCall({
        callData: {
          customerName,
          topic,
        },
        messageData: JSON.parse(messagesString),
      });

      if ('error' in response) {
        throw new Error(response.error.message);
      }

      await navigate(`/calls/${response.callId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen w-full">
      <NavBar />
      <main className="flex flex-col gap-6 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">Analyze a New Call</h1>
          <span className="text-sm text-slate-500">Paste in the call transcript as JSON.</span>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Customer Name</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Shayan Bhatti"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Topic</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Subscription cancellation"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Transcript</span>
            <textarea
              value={messagesString}
              onChange={(e) => setMessagesString(e.target.value)}
              placeholder='[{"role": "agent", "content": "Hello, how can I help?"}]'
              rows={10}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-500"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onClick}
            className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:cursor-pointer hover:bg-slate-700 transition-colors duration-150"
          >
            Analyze
          </button>
        </div>
      </main>
    </div>
  );
}
