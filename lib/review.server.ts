import { TRACKER_KEY } from './tracker-key.server.ts';

/** Only reveal documented classifications for the exact reviewed media bytes. */
export function reviewAnswer(id: string, sha256: string) {
  const key = TRACKER_KEY[id];
  if (!key || key.sha256 !== sha256) return null;
  return { selections: key.selections, basis: key.basis };
}

export function publicScoreboard(data: {
  revealed: boolean;
  submissions: {
    rank: number;
    nickname: string;
    score: number;
    total: number;
  }[];
}) {
  return {
    revealed: data.revealed,
    submissions: data.revealed
      ? data.submissions.map(({ rank, nickname, score, total }) => ({
          rank,
          nickname,
          score,
          total,
        }))
      : [],
  };
}
