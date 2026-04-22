import { useState } from 'react';
import { useAgentStore } from '../store/agentStore';

export function FanOutModal() {
  const proposal = useAgentStore((s) => s.pendingFanOut);
  const setPendingFanOut = useAgentStore((s) => s.setPendingFanOut);
  const agents = useAgentStore((s) => s.agents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proposal) return null;

  const fromAgent = agents.find((a) => a.id === proposal.fromAgentId);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fan-out/${proposal.id}/confirm`, { method: 'POST' });
      if (!res.ok) {
        setError('Dispatch failed — please try again.');
        return;
      }
      setPendingFanOut(null);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    setLoading(true);
    try {
      await fetch(`/api/fan-out/${proposal.id}/reject`, { method: 'POST' });
      setPendingFanOut(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Parallel task dispatch</h2>
          <p className="text-zinc-400 text-sm mt-1">
            <span className="text-white">{fromAgent?.name ?? 'An agent'}</span> wants to assign{' '}
            {proposal.tasks.length} task{proposal.tasks.length !== 1 ? 's' : ''} in parallel.
          </p>
        </div>

        <ul className="space-y-2">
          {proposal.tasks.map((task, i) => (
            <li key={i} className="bg-zinc-800 rounded-lg px-4 py-3">
              <div className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{task.agent}</div>
              <div className="text-zinc-200 text-sm line-clamp-2">{task.prompt}</div>
            </li>
          ))}
        </ul>

        <p className="text-zinc-500 text-xs">
          Agents will start immediately and work independently. You will not receive a combined result.
        </p>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={reject}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition text-sm font-medium"
          >
            Reject
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Dispatching…' : `Dispatch ${proposal.tasks.length} tasks`}
          </button>
        </div>
      </div>
    </div>
  );
}
