'use client';

import { type ReactNode, type SyntheticEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, post } from '@/lib/client';
import {ResetBrowserSession} from './reset-browser-session';

type AccessState = 'checking' | 'required' | 'admitted';

export function ParticipantAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const instructorRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  const [state, setState] = useState<AccessState>('checking');
  const [nickname, setNickname] = useState('');
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (instructorRoute) return;
    let active = true;
    api<{ participant: boolean; instructorAuthenticated: boolean }>('session')
      .then((session) => {
        if (active)
          setState(
            session.participant || session.instructorAuthenticated
              ? 'admitted'
              : 'required',
          );
      })
      .catch((error) => {
        if (!active) return;
        setMessage((error as Error).message);
        setState('required');
      });
    return () => {
      active = false;
    };
  }, [instructorRoute]);

  if (instructorRoute || state === 'admitted') return children;

  async function enter(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await post('join', { nickname, passcode });
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
        <p className="eyebrow">HANDS-ON · DEEPFAKE DETECTION</p>
        <h1 id="entry-title">Enter the workshop</h1>
        {state === 'checking' ? (
          <output>Checking your workshop access…</output>
        ) : (
          <form onSubmit={enter}>
            <p>
              Choose a nickname, then enter the shared passcode provided by the
              presenter.
            </p>
            <label className="field-label" htmlFor="participant-nickname">
              Nickname
            </label>
            <input
              id="participant-nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoComplete="off"
              maxLength={80}
              required
            />
            <p className="small muted entry-help">
              Use an informal name rather than your full real name. It identifies
              this browser session; this review version collects no quiz answers.
            </p>
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
              disabled={busy || !nickname.trim() || !passcode}
            >
              {busy ? 'Checking…' : 'Enter workshop'}
            </button>
          </form>
        )}
      </section>
      <ResetBrowserSession/>
    </main>
  );
}
