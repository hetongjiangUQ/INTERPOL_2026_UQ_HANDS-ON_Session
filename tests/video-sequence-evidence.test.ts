import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  VIDEO_SEQUENCE_METHODS,
  videoSequenceAudienceSummary,
  videoSequenceMethods,
} from '../lib/video-sequence-evidence.ts';
import { validateVideoSequencePack } from '../lib/video-sequence-evidence-validation.ts';

type PackagedSequenceEvidence = {
  run: { summarySha256: string };
  cases: Array<{
    mediaSha256: string;
    results: Array<{
      method: string;
      rawScore: number;
      repositoryRevision: string;
      [key: string]: unknown;
    }>;
  }>;
};

const packaged = JSON.parse(
  readFileSync(
    new URL('../lib/video-sequence-evidence.server.json', import.meta.url),
    'utf8',
  ),
) as PackagedSequenceEvidence;

void test('every sequence-video case presents the same two temporal methods', () => {
  for (const exerciseId of [
    'quiz-video-authentic-hard',
    'quiz-video-synthetic-hard',
    'quiz-faceswap-video-v1',
  ]) {
    assert.deepEqual(videoSequenceMethods(exerciseId), ['d3', 'pwtf-dvd']);
  }
  assert.deepEqual(videoSequenceMethods('quiz-first-look'), []);
  assert.equal(VIDEO_SEQUENCE_METHODS.d3.task, 'fully generated video');
  assert.equal(
    VIDEO_SEQUENCE_METHODS['pwtf-dvd'].task,
    'temporal face forgery',
  );
});

void test('sequence evidence preserves the four exact-file mappings and eight measured outputs', () => {
  const cases = validateVideoSequencePack(packaged);
  assert.deepEqual(
    cases.map((c) => c.exerciseId),
    [
      'quiz-video-authentic-hard',
      'quiz-video-synthetic-hard',
      'quiz-faceswap-video-v1',
      'quiz-faceswap-video-v2',
    ],
  );
  assert.deepEqual(
    cases.map((c) => c.mediaSha256),
    [
      '7d4cc1bf7325dfd2222fd5194c05cc07ca194436489c2de53a75c0961429c036',
      'd557d12335e607e4fe9f05655ac6865762ac9a97596eb9f06aaec8685ba13df5',
      '5d716680050e2c459b5bf0d30449689512dfa9f44510a157e2b4a73479a36f42',
      'ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632',
    ],
  );
  assert.deepEqual(
    cases.map((c) => c.results.map((r) => r.method)),
    [
      ['d3', 'pwtf-dvd'],
      ['d3', 'pwtf-dvd'],
      ['d3', 'pwtf-dvd'],
      ['d3', 'pwtf-dvd'],
    ],
  );
  assert.deepEqual(
    cases.flatMap((c) => c.results.map((r) => r.rawScore)),
    [
      5.080155849456787, 0.0014261669387261187, 0.6578940749168396,
      0.018978793130005795, 2.150648832321167, 0.5936067346781587,
      5.379194259643555, 0.00416635237662576,
    ],
  );
  assert.equal(cases[3].computedDate, '2026-10-11');
  assert.equal(cases[0].computedDate, '2026-09-28');
  assert.notEqual(cases[3].run.summarySha256, cases[0].run.summarySha256);
  assert.equal(
    cases[0].run.summarySha256,
    '48f73f6648e62d6671dcc64f5e2a7d9bded49bd6968c6fce86e14419653e0a5c',
  );
  assert.ok(
    cases.every((c) =>
      c.results.every(
        (r) =>
          r.sourceResultSha256.length === 64 && r.runnerSha256.length === 64,
      ),
    ),
  );
});

void test('D3 remains an unbounded statistic and PwTF-DVD remains a separate uncalibrated output', () => {
  const cases = validateVideoSequencePack(packaged);
  const d3 = cases.flatMap((c) => c.results).filter((r) => r.method === 'd3');
  const pwtf = cases
    .flatMap((c) => c.results)
    .filter((r) => r.method === 'pwtf-dvd');
  assert.ok(d3.some((r) => r.rawScore > 1));
  assert.ok(
    d3.every(
      (r) =>
        /unbounded/i.test(r.interpretation) &&
        /not a probability/i.test(r.limitations),
    ),
  );
  assert.ok(
    pwtf.every(
      (r) =>
        r.rawScore >= 0 &&
        r.rawScore <= 1 &&
        /not a calibrated probability/i.test(r.limitations),
    ),
  );
  const syntheticPwtf = cases
    .find((c) => c.exerciseId === 'quiz-video-synthetic-hard')!
    .results.find((r) => r.method === 'pwtf-dvd')!;
  assert.equal(syntheticPwtf.scope, 'outside-primary-task');
  assert.match(syntheticPwtf.scopeNote!, /fully generated Sora clip/i);
  const faceSwapD3 = cases
    .find((c) => c.exerciseId === 'quiz-faceswap-video-v1')!
    .results.find((r) => r.method === 'd3')!;
  assert.equal(faceSwapD3.scope, 'outside-primary-task');
  assert.match(faceSwapD3.scopeNote!, /not a face-swap verdict/i);
});

void test('participant summaries use only supported workshop comparisons and reject cross-task interpretation', () => {
  const cases = validateVideoSequencePack(packaged);
  const authentic = cases.find(
    (candidate) => candidate.exerciseId === 'quiz-video-authentic-hard',
  )!;
  const generated = cases.find(
    (candidate) => candidate.exerciseId === 'quiz-video-synthetic-hard',
  )!;
  const faceSwap = cases.find(
    (candidate) => candidate.exerciseId === 'quiz-faceswap-video-v1',
  )!;
  const result = (caseEvidence: (typeof cases)[number], method: string) =>
    caseEvidence.results.find((candidate) => candidate.method === method)!;

  assert.ok(
    result(authentic, 'd3').rawScore > result(generated, 'd3').rawScore,
  );
  assert.ok(
    result(authentic, 'pwtf-dvd').rawScore <
      result(faceSwap, 'pwtf-dvd').rawScore,
  );
  assert.match(
    videoSequenceAudienceSummary(authentic.exerciseId, result(authentic, 'd3')),
    /D3: 5\.0802 versus 0\.6579.*4\.4223 higher on D3's own scale.*more real-like result in this pair/i,
  );
  assert.match(
    videoSequenceAudienceSummary(
      faceSwap.exerciseId,
      result(faceSwap, 'pwtf-dvd'),
    ),
    /PwTF-DVD: 0\.593607 versus 0\.001426.*0\.592181 higher on PwTF-DVD's own scale.*more face-forgery-like result in this pair/i,
  );
  assert.match(
    videoSequenceAudienceSummary(generated.exerciseId, result(generated, 'd3')),
    /D3: 0\.6579 versus 5\.0802.*4\.4223 lower on D3's own scale.*more generated-like result in this pair/i,
  );
  assert.match(
    videoSequenceAudienceSummary(faceSwap.exerciseId, result(faceSwap, 'd3')),
    /D3 raw value: 2\.1506.*face-swap case is outside D3's fully generated-video task/i,
  );
  assert.match(
    videoSequenceAudienceSummary(
      generated.exerciseId,
      result(generated, 'pwtf-dvd'),
    ),
    /PwTF-DVD raw value: 0\.018979.*fully generated case is outside PwTF-DVD's face-forgery task/i,
  );
});

void test('sequence evidence rejects hash, method-set, score and audit-record tampering', () => {
  const malformed = (
    change: (copy: PackagedSequenceEvidence) => void,
    match?: RegExp,
  ) => {
    const copy = structuredClone(packaged);
    change(copy);
    if (match) assert.throws(() => validateVideoSequencePack(copy), match);
    else assert.throws(() => validateVideoSequencePack(copy));
  };
  malformed((copy) => {
    copy.cases[0].mediaSha256 = '0'.repeat(64);
  });
  malformed((copy) => {
    copy.cases[0].results.push(structuredClone(copy.cases[0].results[0]));
  });
  malformed((copy) => {
    const pwtf = copy.cases[2].results.find(
      (result) => result.method === 'pwtf-dvd',
    )!;
    pwtf.rawScore = 1.1;
  }, /PwTF/);
  malformed((copy) => {
    copy.cases[0].results[0].repositoryRevision = 'main';
  });
  malformed((copy) => {
    copy.cases[0].results[0].scope = 'outside-primary-task';
  });
  malformed((copy) => {
    copy.cases[1].results = [];
  });
  malformed((copy) => {
    copy.run.summarySha256 = 'missing';
  });
});
