import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason?: string };
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; suggestions: Workout[] };

export default function Workouts() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`)
      .then(({ suggestions }) => { if (active) setState({ status: 'success', suggestions }); })
      .catch((error: unknown) => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }); });
    return () => { active = false; };
  }, []);

  return <section><h2>Workout suggestions</h2>
    {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {state.status === 'error' && <p role="alert">Unable to load workout suggestions: {state.message}</p>}
    {state.status === 'success' && (state.suggestions.length === 0
      ? <p>No workout suggestions yet.</p>
      : <ul>{state.suggestions.map((workout, index) => <li key={workout._id ?? `${workout.title}-${index}`}>
        {workout.title} - {workout.focus}, {workout.minutes} minutes, {workout.difficulty}
        {workout.reason && <span> - {workout.reason}</span>}
      </li>)}</ul>)}
  </section>;
}
