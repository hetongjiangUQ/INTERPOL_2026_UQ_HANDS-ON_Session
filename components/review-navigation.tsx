'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { ReviewCredits } from './review-credits';
type Scores = {
  revealed: boolean;
  submissions: {
    rank: number;
    nickname: string;
    score: number;
    total: number;
  }[];
};
export function ReviewNavigation() {
  const [panel, setPanel] = useState<'scoreboard' | 'references' | null>(null);
  return (
    <>
      <nav className="actions" aria-label="Review resources">
        <button
          className="secondary"
          aria-expanded={panel === 'scoreboard'}
          aria-controls="review-resources"
          onClick={() => setPanel(panel === 'scoreboard' ? null : 'scoreboard')}
        >
          Final scoreboard
        </button>
        <button
          className="secondary"
          aria-expanded={panel === 'references'}
          aria-controls="review-resources"
          onClick={() => setPanel(panel === 'references' ? null : 'references')}
        >
          Reference list
        </button>
        <a
          className="secondary inline"
          href="/guides/hands-on-session-instruction-manual.pdf"
          download
        >
          Instruction manual (pdf)
        </a>
      </nav>
      <div id="review-resources">
        {panel && (
          <button className="secondary" onClick={() => setPanel(null)}>
            Close {panel === 'scoreboard' ? 'scoreboard' : 'references'}
          </button>
        )}
        {panel === 'references' && <ReviewCredits />}
        {panel === 'scoreboard' && <Scoreboard />}
      </div>
    </>
  );
}
function Scoreboard() {
  const [data, setData] = useState<Scores | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<Scores>('review/scoreboard')
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="panel">
      <h2>Final scoreboard</h2>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Loading scoreboard…</p>
      ) : !data.revealed ? (
        <p>
          The instructor has not published the final scoreboard for this
          session.
        </p>
      ) : !data.submissions.length ? (
        <p>No submitted results are stored in this copy of the website.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Nickname</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((s, i) => (
              <tr key={i}>
                <td>{s.rank}</td>
                <td>{s.nickname}</td>
                <td>
                  {s.score} / {s.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
