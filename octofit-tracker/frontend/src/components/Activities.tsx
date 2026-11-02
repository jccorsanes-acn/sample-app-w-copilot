import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; activities: Activity[] };

export default function Activities() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities }) => { if (active) setState({ status: 'success', activities }); })
      .catch((error: unknown) => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }); });
    return () => { active = false; };
  }, []);

  return <section><h2>Activities</h2>
    {state.status === 'loading' && <p role="status">Loading activities...</p>}
    {state.status === 'error' && <p role="alert">Unable to load activities: {state.message}</p>}
    {state.status === 'success' && (state.activities.length === 0
      ? <p>No activities yet.</p>
      : <ul>{state.activities.map((activity, index) => <li key={activity._id ?? `${activity.type}-${index}`}>
        {activity.type} - {activity.minutes} minutes, {activity.points} points
      </li>)}</ul>)}
  </section>;
}
