import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reviewAnswer, publicScoreboard } from '../lib/review.server.ts';
import { TRACKER_KEY } from '../lib/tracker-key.server.ts';
test('review answers require exact known media bindings', () => {
  for (const [id, key] of Object.entries(TRACKER_KEY)) {
    assert.deepEqual(reviewAnswer(id, key.sha256), {
      selections: key.selections,
      basis: key.basis,
    });
    assert.equal(reviewAnswer(id, 'changed-media'), null);
  }
  assert.equal(reviewAnswer('unknown', ''), null);
});
test('public scoreboard withholds unpublished results and strips private fields', () => {
  const row = {
    rank: 1,
    nickname: 'Example',
    score: 8,
    total: 10,
    participant_id: 'private',
    answers: 'private',
    submitted_at: 'private',
  };
  assert.deepEqual(publicScoreboard({ revealed: false, submissions: [row] }), {
    revealed: false,
    submissions: [],
  });
  assert.deepEqual(publicScoreboard({ revealed: true, submissions: [row] }), {
    revealed: true,
    submissions: [{ rank: 1, nickname: 'Example', score: 8, total: 10 }],
  });
});
