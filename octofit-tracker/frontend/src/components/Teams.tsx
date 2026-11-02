import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; teams: Team[] };

export default function Teams() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => { if (active) setState({ status: 'success', teams }); })
      .catch((error: unknown) => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }); });
    return () => { active = false; };
  }, []);

  return <section><h2>Teams</h2>
    {state.status === 'loading' && <p role="status">Loading teams...</p>}
    {state.status === 'error' && <p role="alert">Unable to load teams: {state.message}</p>}
    {state.status === 'success' && (state.teams.length === 0
      ? <p>No teams yet.</p>
      : <ul>{state.teams.map((team, index) => <li key={team._id ?? `${team.name}-${index}`}>
        {team.name} - mascot: {team.mascot}; {team.members.length} members
      </li>)}</ul>)}
  </section>;
}
