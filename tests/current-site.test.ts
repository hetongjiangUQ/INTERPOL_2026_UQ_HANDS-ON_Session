import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {CURRENT_MEDIA_TITLES,CURRENT_QUIZ_MEDIA_CREDITS} from '../lib/acknowledgements.ts';
import {TRACKER_KEY} from '../lib/tracker-key.server.ts';
import {CLASSIFICATION_GUIDANCE} from '../lib/domain.ts';

test('landing page links to the supplied website source repository',()=>{
  const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.match(source,/https:\/\/github\.com\/hetongjiangUQ\/INTERPOL_2026_UQ_HANDS-ON_Session/);
  assert.match(source,/rel="noopener noreferrer"/);
});

test('final credits include both authentic references and only the current video',()=>{
  const credits=JSON.parse(readFileSync(new URL('../lib/sample-credits.json',import.meta.url),'utf8'));
  const visible=credits.filter((c:{title:string})=>CURRENT_MEDIA_TITLES.has(c.title));
  assert.equal(visible.length,CURRENT_MEDIA_TITLES.size);
  const portrait=visible.find((c:{title:string})=>c.title==='Authentic comparison reference — presenter portrait');
  assert(portrait);
  const bytes=readFileSync(new URL('../public/samples/references/authentic-portrait.png',import.meta.url));
  assert(portrait.changes.includes(createHash('sha256').update(bytes).digest('hex')));
  assert.match(visible.find((c:{title:string})=>c.title==='Watermark lab — yo-yo photograph').changes,/authentic item comparison reference/);
  assert(!visible.some((c:{title:string})=>c.title.includes('Wikimedia face-swap')));
});

test('credits number the ten current assets in quiz order, separate from references',()=>{
  const credits=JSON.parse(readFileSync(new URL('../lib/sample-credits.json',import.meta.url),'utf8')) as {title:string}[];
  assert.equal(CURRENT_QUIZ_MEDIA_CREDITS.length,10);
  assert.deepEqual(CURRENT_QUIZ_MEDIA_CREDITS.map(item=>item.quizId),
    RECOMMENDED_QUIZZES.map(id=>id==='quiz-faceswap-video-v1'?'quiz-faceswap-video-v2':id));
  assert.equal(new Set(CURRENT_QUIZ_MEDIA_CREDITS.map(item=>item.assetTitle)).size,10);
  for(const {assetTitle} of CURRENT_QUIZ_MEDIA_CREDITS)assert.equal(credits.filter(item=>item.title===assetTitle).length,1);
  const source=readFileSync(new URL('../components/admin-credits.tsx',import.meta.url),'utf8');
  assert.match(source,/CURRENT_QUIZ_MEDIA_CREDITS\.map/);
  assert.match(source,/Quiz \{index\+1\}/);
  assert.match(source,/Comparison references and watermark input/);
  assert.match(source,/<h3 id="credits-branding-heading">Branding<\/h3>/);
  assert.doesNotMatch(source,/Use and interpretation|CLASSIFICATION_GUIDANCE|data\.policy|data\.evidence/);
});

test('camera-origin answers disclose processing and participant definitions',()=>{
  assert.match(TRACKER_KEY['quiz-user-image-b-v2'].basis,/2730 × 4096/);
  assert.match(TRACKER_KEY['quiz-user-image-b-v2'].basis,/re-encodes/);
  assert.match(TRACKER_KEY['quiz-image-five'].basis,/Snapseed 2.0/);
  assert.match(TRACKER_KEY['quiz-image-five'].basis,/editing steps are unknown/);
  assert.match(CLASSIFICATION_GUIDANCE,/not necessarily an untouched file/);
  assert.match(readFileSync(new URL('../components/training.tsx',import.meta.url),'utf8'),/\{CLASSIFICATION_GUIDANCE\}/);
});
import { QUIZ_BANK, RECOMMENDED_QUIZZES } from '../lib/quiz-bank.ts';
import {
  DEFAULT_WORKSHOP,
  INSPECTION_REQUIRES_FIRST_ANSWER,
} from '../lib/workshop-config.ts';
import {
  validatePortraitHardPair,
  type PortraitHardPairData,
} from '../lib/portrait-catalog.ts';
import { validateControlledFaceSwapStill } from '../lib/controlled-face-swap-still.server.ts';
import { validateUserImageCases } from '../lib/user-image-cases.server.ts';
import { readWorkshop } from '../lib/workshop-config.server.ts';
import { replaceRetiredQuiz8 } from '../lib/quiz8-replacement.ts';
import {
  clampVideoTime,
  finiteVideoDuration,
  formatVideoTime,
} from '../lib/video-seek.ts';

const root = new URL('../', import.meta.url);
test('final submission provides the supplied PDF as an independent download', () => {
  const source = readFileSync(new URL('components/workshop-tracker.tsx', root), 'utf8');
  assert.match(source, /className="secondary tracker-manual-download" href="\/guides\/hands-on-session-instruction-manual\.pdf" download="hands-on session instruction manual\.pdf"/);
  const pdf = readFileSync(new URL('public/guides/hands-on-session-instruction-manual.pdf', root));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(createHash('sha256').update(pdf).digest('hex'), '44e21bd032fc2f3f080b48bd70856b903b6f28f56551df7c8eb7fc6a561953cd');
});
const json = <T>(path: string) =>
  JSON.parse(readFileSync(new URL(path, root), 'utf8')) as T;
const sha = (path: string) =>
  createHash('sha256')
    .update(readFileSync(new URL(path, root)))
    .digest('hex');

type SavedWorkshop = { revision: number; content: string; created_at: string };
class FakeStatement {
  args: unknown[] = [];
  readonly database: FakeWorkshopDatabase;
  readonly sql: string;
  constructor(database: FakeWorkshopDatabase, sql: string) {
    this.database = database;
    this.sql = sql;
  }
  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }
  async first<T>() {
    if (!this.sql.includes('ORDER BY revision DESC'))
      throw new Error('Unexpected first() query.');
    return (this.database.versions.at(-1) ?? null) as T | null;
  }
}
class FakeWorkshopDatabase {
  updates = new Map<string, string>();
  batchCalls = 0;
  versions: SavedWorkshop[];
  assessments: Array<Record<string, unknown>>;
  constructor(
    versions: SavedWorkshop[],
    assessments: Array<Record<string, unknown>> = [],
  ) {
    this.versions = versions;
    this.assessments = assessments;
  }
  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }
  async batch(statements: FakeStatement[]) {
    this.batchCalls++;
    const results = [];
    for (const statement of statements) {
      let changes = 0;
      if (
        statement.sql.includes('INSERT OR IGNORE INTO workshop_config_versions')
      ) {
        const [
          revision,
          content,
          createdAt,
          expectedLatest,
          sourceRevision,
          sourceContent,
          marker,
        ] = statement.args as [
          number,
          string,
          string,
          number,
          number,
          string,
          string,
        ];
        const latest = this.versions.at(-1)?.revision ?? 0;
        const source = this.versions.find(
          (item) =>
            item.revision === sourceRevision && item.content === sourceContent,
        );
        if (
          latest === expectedLatest &&
          source &&
          !this.updates.has(marker) &&
          !this.versions.some((item) => item.revision === revision)
        ) {
          this.versions.push({ revision, content, created_at: createdAt });
          changes = 1;
        }
      } else if (
        statement.sql.includes('INSERT OR IGNORE INTO workshop_updates')
      ) {
        const [marker, appliedAt, revision, content] = statement.args as [
          string,
          string,
          number,
          string,
        ];
        if (
          !this.updates.has(marker) &&
          this.versions.some(
            (item) => item.revision === revision && item.content === content,
          )
        ) {
          this.updates.set(marker, appliedAt);
          changes = 1;
        }
      } else throw new Error('Unexpected batch query.');
      results.push({ meta: { changes } });
    }
    return results;
  }
}

const previousSevenCaseConfig = () => ({
  ...structuredClone(DEFAULT_WORKSHOP),
  practices: structuredClone(DEFAULT_WORKSHOP.practices.slice(0, 7)),
});

test('fresh configuration exposes the ten distributable cases and current watermark options', () => {
  const ids = [
    'quiz-first-look',
    'quiz-video-authentic-hard',
    'quiz-video-synthetic-hard',
    'quiz-image-five',
    'quiz-portrait-d',
    'quiz-portrait-e',
    'quiz-faceswap-still-v3',
    'quiz-faceswap-video-v1',
    'quiz-user-image-a-v1',
    'quiz-user-image-b-v2',
  ];
  assert.deepEqual(
    QUIZ_BANK.filter(item=>item.id!=='quiz-faceswap-video-v2').map((item) => item.id),
    ids,
  );
  assert.deepEqual([...RECOMMENDED_QUIZZES], ids);
  assert.deepEqual(
    DEFAULT_WORKSHOP.practices.map((item) => item.id),
    ids,
  );
  assert.ok(DEFAULT_WORKSHOP.practices.every((item) => item.enabled));
  assert.deepEqual(DEFAULT_WORKSHOP.watermark, {
    enabled: true,
    method: 'blue-lsb',
    methodChoice: true,
    uploads: true,
    recovery: true,
    transforms: false,
    details: true,
    download: false,
  });
  assert.equal(QUIZ_BANK.filter((item) => item.video).length, 4); // includes retired v1 for historical settings
  assert.equal(QUIZ_BANK.filter((item) => !item.video).length, 7);
  assert.ok(
    QUIZ_BANK.filter(item=>item.id!=='quiz-faceswap-video-v2').every(
      (item) =>
        item.inspection &&
        item.inspection.steps.length === 3 &&
        item.inspection.question &&
        item.inspection.limitation,
    ),
  );
  assert.deepEqual(
    DEFAULT_WORKSHOP.practices.map((item) => item.tools),
    [
      ['layers', 'texture', 'univfd', 'community', 'spai', 'aide'],
      ['timeline', 'univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
      ['timeline', 'univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
      ['compression', 'ela', 'univfd', 'community', 'spai', 'aide'],
      [],
      [],
      [
        'layers',
        'texture',
        'univfd',
        'community',
        'spai',
        'aide',
        'gend',
        'fatformer',
      ],
      ['timeline', 'univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
      [
        'layers',
        'texture',
        'univfd',
        'community',
        'spai',
        'aide',
        'gend',
        'fatformer',
      ],
      ['layers', 'texture', 'univfd', 'community', 'spai', 'aide', 'fatformer'],
    ],
  );
  const portraitPair = QUIZ_BANK.filter((item) => item.stress);
  assert.deepEqual(
    portraitPair.map((item) => item.manualTools),
    [
      ['layers', 'texture'],
      ['layers', 'texture'],
    ],
  );
  assert.equal(portraitPair[0].inspection?.regions?.length, 5);
  assert.deepEqual(
    portraitPair[1].inspection?.regions,
    portraitPair[0].inspection?.regions,
  );
  assert.equal(
    QUIZ_BANK.filter(item=>item.id!=='quiz-faceswap-video-v1').reduce((total, item) => total + item.minutes, 0),
    28,
  );
});

test('only the two selected public images seed the current image cases', () => {
  const examples = json<
    Array<{
      id: string;
      url: string;
      sha256: string;
      results: Array<{ model: string }>;
    }>
  >('lib/examples-data.server.json');
  assert.deepEqual(
    examples.map((item) => item.id),
    ['source-example-01', 'source-example-02'],
  );
  assert.deepEqual(
    examples[1].results.map((item) => item.model),
    ['community', 'univfd', 'spai', 'aide'],
  );
  for (const item of examples)
    assert.equal(sha('public' + item.url), item.sha256);
});

test('the bundled videos and portrait pair preserve exact media bindings', () => {
  const videos = json<
    Array<{
      id: string;
      url: string;
      sha256: string;
      results: Array<{
        model: string;
        mediaSha256: string;
        samples: unknown[];
      }>;
    }>
  >('lib/video-cases.server.json');
  assert.deepEqual(
    videos.map((item) => item.id),
    ['quiz-video-authentic-hard', 'quiz-video-synthetic-hard'],
  );
  for (const item of videos) {
    assert.equal(sha('public' + item.url), item.sha256);
    assert.deepEqual(
      item.results.map((result) => result.model),
      ['univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
    );
    assert.ok(
      item.results.every(
        (result) =>
          result.mediaSha256 === item.sha256 && result.samples.length === 8,
      ),
    );
  }

  const packaged = json<{
    data: PortraitHardPairData;
    assets: Record<string, { base64: string; sha256: string }>;
  }>('lib/portrait-hard-pair-data.server.json');
  const data = validatePortraitHardPair(packaged.data);
  assert.deepEqual(
    data.cases.map((item) => item.id),
    ['hard-authentic', 'hard-synthetic'],
  );
  for (const item of data.cases) {
    const bytes = Buffer.from(packaged.assets[item.id].base64, 'base64');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.equal(packaged.assets[item.id].sha256, item.sha256);
  }
});

test('the controlled face-swap still is exact, attributed and carries six matching cached results', () => {
  const packaged = validateControlledFaceSwapStill(
    json('lib/controlled-face-swap-still.server.json'),
  );
  const item = packaged.case;
  assert.equal(item.id, 'quiz-faceswap-still-v3');
  assert.equal(item.bytes, 686653);
  assert.equal(
    item.sha256,
    '1ba3d918c6c3e6f660dad8ee8edb1317ca87195ce344e36995bcf17379e0b802',
  );
  assert.equal(sha('public' + item.url), item.sha256);
  assert.deepEqual(
    item.results.map((result) => result.model),
    ['univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
  );
  assert.ok(item.results.every((result) => result.mediaSha256 === item.sha256));
  assert.equal(packaged.source.licence, 'CC BY 4.0');
  assert.match(packaged.source.identityStatus, /synthetic adult identities/i);
  assert.match(packaged.source.reviewStatus, /vendor-published/i);
});


test('the two creator-authorised images are exact and retain their distinct detector sets', () => {
  const packaged = validateUserImageCases(
    json('lib/user-image-cases.server.json'),
  );
  assert.match(
    packaged.source.status,
    /creator authorization recorded 29 September 2026/i,
  );
  assert.match(packaged.source.evidenceStatus, /not signed provenance/i);
  assert.deepEqual(
    packaged.cases.map((item) => item.id),
    ['quiz-user-image-a-v1', 'quiz-user-image-b-v2'],
  );
  const [portrait, bokeh] = packaged.cases;
  assert.equal(portrait.truth, 'manipulated');
  assert.equal(bokeh.truth, 'authentic');
  assert.deepEqual(
    portrait.results.map((result) => result.model),
    ['univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'],
  );
  assert.deepEqual(
    bokeh.results.map((result) => result.model),
    ['univfd', 'community', 'spai', 'aide', 'fatformer'],
  );
  assert.deepEqual(bokeh.unavailableDetectors, { gend: 'requires-face' });
  for (const item of packaged.cases) {
    assert.equal(
      readFileSync(new URL('public' + item.url, root)).length,
      item.bytes,
    );
    assert.equal(sha('public' + item.url), item.sha256);
    assert.ok(
      item.results.every((result) => result.mediaSha256 === item.sha256),
    );
  }
});

test('every participant video uses the shared draggable seek control with a direct-build fallback', () => {
  const inspector = readFileSync(
    new URL('components/media-inspector.tsx', root),
    'utf8',
  );
  const practices = readFileSync(
    new URL('components/practice-tools.tsx', root),
    'utf8',
  );
  const player = readFileSync(
    new URL('components/seekable-video.tsx', root),
    'utf8',
  );
  const styles = readFileSync(new URL('app/globals.css', root), 'utf8');
  assert.match(
    inspector,
    /<SeekableVideo[\s\S]*seekLabel=\{`\$\{e\.title\} position`\}/,
  );
  assert.equal((practices.match(/<SeekableVideo/g) ?? []).length, 2);
  assert.match(player, /type="range"/);
  assert.match(player, /video\.currentTime = bounded/);
  assert.match(player, /Range: 'bytes=0-0'/);
  assert.match(player, /URL\.createObjectURL\(blob\)/);
  assert.match(
    styles,
    /\.video-seek-control input\[type='range'\][\s\S]*touch-action:\s*none/,
  );
});

test('video seek helpers clamp unsafe values and format finite labels', () => {
  assert.equal(finiteVideoDuration(4.379379), 4.379379);
  assert.equal(finiteVideoDuration(0), 0);
  assert.equal(finiteVideoDuration(-1), 0);
  assert.equal(finiteVideoDuration(Number.NaN), 0);
  assert.equal(finiteVideoDuration(Number.POSITIVE_INFINITY), 0);
  assert.equal(clampVideoTime(-2, 5), 0);
  assert.equal(clampVideoTime(2.5, 5), 2.5);
  assert.equal(clampVideoTime(9, 5), 5);
  assert.equal(clampVideoTime(Number.NaN, 5), 0);
  assert.equal(clampVideoTime(2, Number.POSITIVE_INFINITY), 0);
  assert.equal(formatVideoTime(4.379379), '0:04.3');
  assert.equal(formatVideoTime(53.112), '0:53.1');
  assert.equal(formatVideoTime(Number.NaN), '0:00.0');
  assert.equal(formatVideoTime(Number.POSITIVE_INFINITY), '0:00.0');
});


test('participant entry and key-only instructor access are wired into the distributable site', () => {
  const layout = readFileSync(new URL('app/layout.tsx', root), 'utf8');
  const gate = readFileSync(
    new URL('components/participant-access-gate.tsx', root),
    'utf8',
  );
  const admin = readFileSync(
    new URL('components/admin-panel.tsx', root),
    'utf8',
  );
  const migration = readFileSync(
    new URL('drizzle/0004_lowly_blacklash.sql', root),
    'utf8',
  );
  assert.match(layout, /ParticipantAccessGate/);
  assert.match(gate, /post\('join', \{ passcode \}\)/);
  assert.doesNotMatch(gate, /participant-nickname|Choose a nickname/);
  assert.match(gate, /hetong\.jiang@uq\.edu\.au/);
  assert.match(gate, /Workshop passcode/);
  assert.match(
    admin,
    /<label className="field-label" htmlFor="admin-key">Admin passcode<\/label>/,
  );
  assert.match(migration, /participants[\s\S]*nickname/i);
  assert.match(migration, /participants[\s\S]*access_tag/i);
});

test('inspection is available before the first answer by default', () => {
  assert.equal(INSPECTION_REQUIRES_FIRST_ANSWER, false);
});

test('a persisted seven-case default upgrades once without changing responses', async () => {
  const previous = previousSevenCaseConfig();
  const assessments = [
    {
      participant_id: 'participant-1',
      exercise_id: 'quiz-first-look',
      initial: 'uncertain',
      updated_at: '2026-09-29T00:00:00.000Z',
    },
  ];
  const database = new FakeWorkshopDatabase(
    [
      {
        revision: 7,
        content: JSON.stringify(previous),
        created_at: '2026-09-28T00:00:00.000Z',
      },
    ],
    structuredClone(assessments),
  );
  const beforeAssessments = structuredClone(database.assessments);

  const upgraded = await readWorkshop(database as unknown as D1Database);
  assert.equal(upgraded.revision, 8);
  assert.deepEqual(
    upgraded.config.practices.map((item) => item.id),
    RECOMMENDED_QUIZZES.map(id=>id==='quiz-faceswap-video-v1'?'quiz-faceswap-video-v2':id),
  );
  assert.ok(upgraded.config.practices.every((item) => item.enabled));
  assert.equal(database.versions.length, 2);
  assert.ok(database.updates.has('default-session-seven-to-ten-v1'));
  assert.deepEqual(database.assessments, beforeAssessments);

  const secondRead = await readWorkshop(database as unknown as D1Database);
  assert.deepEqual(secondRead, upgraded);
  assert.equal(database.versions.length, 2);
  assert.equal(database.batchCalls, 1);
  assert.deepEqual(database.assessments, beforeAssessments);
});

test('reordered, disabled and custom persisted sessions are not auto-upgraded', async () => {
  const cases: [
    string,
    (config: ReturnType<typeof previousSevenCaseConfig>) => void,
  ][] = [
    [
      'reordered',
      (config) => {
        [config.practices[0], config.practices[1]] = [
          config.practices[1],
          config.practices[0],
        ];
      },
    ],
    [
      'disabled',
      (config) => {
        config.practices[0].enabled = false;
      },
    ],
    [
      'additional',
      (config) => {
        config.practices.push({
          ...config.practices[0],
          id: 'instructor-custom-case',
        });
      },
    ],
    [
      'custom ID',
      (config) => {
        config.practices[0].id = 'instructor-custom-case';
      },
    ],
  ];
  for (const [name, change] of cases) {
    const config = previousSevenCaseConfig();
    change(config);
    const database = new FakeWorkshopDatabase([
      {
        revision: 3,
        content: JSON.stringify(config),
        created_at: '2026-09-28T00:00:00.000Z',
      },
    ]);
    const snapshot = await readWorkshop(database as unknown as D1Database);
    assert.equal(snapshot.revision, 3, name);
    assert.deepEqual(snapshot.config, replaceRetiredQuiz8(config), name);
    assert.equal(database.versions.length, 1, name);
    assert.equal(database.batchCalls, 0, name);
    assert.equal(database.updates.size, 0, name);
  }
});
