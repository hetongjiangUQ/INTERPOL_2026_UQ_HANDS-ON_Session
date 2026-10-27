'use client';

import { type ReactNode, type SyntheticEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, post } from '@/lib/client';

type AccessState = 'checking' | 'required' | 'admitted';

export function ParticipantAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Let Next.js display its 404 for the retired route without a passcode form.
  const retiredAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  const [state, setState] = useState<AccessState>('checking');
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (retiredAdminRoute) return;
    let active = true;
    api<{ participant: boolean }>('session')
      .then((session) => {
        if (active)
          setState(session.participant ? 'admitted' : 'required');
      })
      .catch((error) => {
        if (!active) return;
        setMessage((error as Error).message);
        setState('required');
      });
    return () => {
      active = false;
    };
  }, [retiredAdminRoute]);

  if (retiredAdminRoute || state === 'admitted') return children;

  async function enter(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await post('join', { passcode });
      setPasscode('');
      setState('admitted');
    } catch (error) {
      setMessage((error as Error).message);
      setPasscode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="entry-page">
      <section className="panel narrow entry-panel" aria-labelledby="entry-title">
        <h1 id="entry-title">Enter the website</h1>
        {state === 'checking' ? (
          <output>Checking your workshop access…</output>
        ) : (
          <form onSubmit={enter}>
            <p>Enter the shared passcode to open the website.</p>
            <label className="field-label" htmlFor="participant-passcode">
              Workshop passcode
            </label>
            <input
              id="participant-passcode"
              name="passcode"
              type="text"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <p className="small muted entry-help">The passcode is case-sensitive.</p>
            {message && (
              <p className="error" role="alert">
                {message}
              </p>
            )}
            <button
              className="primary full entry-submit"
              type="submit"
              disabled={busy || !passcode}
            >
              {busy ? 'Checking…' : 'Enter website'}
            </button>
          </form>
        )}
        <p className="small muted entry-contact">
          Contact: <a href="mailto:hetong.jiang@uq.edu.au">hetong.jiang@uq.edu.au</a>
        </p>
      </section>
    </main>
  );
}
