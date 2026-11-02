import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Entry = { teamName: string; totalPoints: number; rank: number };
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; leaderboard: Entry[] };

export default function Leaderboard() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => { if (active) setState({ status: 'success', leaderboard }); })
      .catch((error: unknown) => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }); });
    return () => { active = false; };
  }, []);

  return <section><h2>Leaderboard</h2>
    {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
    {state.status === 'error' && <p role="alert">Unable to load leaderboard: {state.message}</p>}
    {state.status === 'success' && (state.leaderboard.length === 0
      ? <p>No leaderboard rankings yet.</p>
      : <ol>{state.leaderboard.map((entry) => <li key={entry.rank}>
        {entry.teamName} - {entry.totalPoints} points
      </li>)}</ol>)}
  </section>;
}
