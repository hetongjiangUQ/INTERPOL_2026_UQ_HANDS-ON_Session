import packaged from './user-image-cases.server.json' with { type: 'json' };
import {
  validateResult,
  type DetectorResult,
  type ModelId,
  type Verdict,
} from './domain.ts';

const EXPECTED_IDS = [
  'quiz-user-image-a-v1',
  'quiz-user-image-b-v2',
] as const;
const EXPECTED_MODELS: Record<(typeof EXPECTED_IDS)[number], ModelId[]> = {
  'quiz-user-image-a-v1': [
    'univfd',
    'community',
    'spai',
    'aide',
    'gend',
    'fatformer',
  ],
  'quiz-user-image-b-v2': ['univfd', 'community', 'spai', 'aide', 'fatformer'],
};
const BOKEH_CASES = new Set<(typeof EXPECTED_IDS)[number]>([
  'quiz-user-image-b-v2',
]);

export type UserImageCase = {
  id: (typeof EXPECTED_IDS)[number];
  mediaId: string;
  kind: 'image';
  title: string;
  url: string;
  mime: 'image/jpeg';
  bytes: number;
  sha256: string;
  sourceSha256: string;
  sourceBytes: number;
  truth: Verdict;
  declaredProcess: string;
  transform: string;
  unavailableDetectors: Partial<Record<ModelId, 'requires-face'>>;
  prompt: string;
  explanation: string;
  results: DetectorResult[];
};

export type UserImageCasesData = {
  schemaVersion: 1;
  createdAt: string;
  source: {
    status: string;
    evidenceStatus: string;
    preprocessingTool: string;
  };
  cases: UserImageCase[];
};

function text(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`User image ${name} is missing.`);
  return value;
}

export function validateUserImageCases(value: unknown): UserImageCasesData {
  const data = structuredClone(value) as UserImageCasesData;
  if (
    !data ||
    data.schemaVersion !== 1 ||
    !Number.isFinite(Date.parse(data.createdAt))
  )
    throw new Error('Invalid user-image package header.');
  for (const key of ['status', 'evidenceStatus', 'preprocessingTool'] as const)
    text(data.source?.[key], `source ${key}`);
  if (!/creator authorization recorded/i.test(data.source.status))
    throw new Error('User-image distribution authorization must remain explicit.');
  if (
    !Array.isArray(data.cases) ||
    JSON.stringify(data.cases.map((item) => item.id)) !==
      JSON.stringify(EXPECTED_IDS)
  )
    throw new Error(
      'User-image package must contain the two selected cases.',
    );
  for (const item of data.cases) {
    for (const key of [
      'mediaId',
      'title',
      'url',
      'mime',
      'declaredProcess',
      'transform',
      'prompt',
      'explanation',
    ] as const)
      text(item[key], `${item.id} ${key}`);
    if (
      item.kind !== 'image' ||
      item.mime !== 'image/jpeg' ||
      !item.url.startsWith('/samples/user-cases/') ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes < 1 ||
      !Number.isSafeInteger(item.sourceBytes) ||
      item.sourceBytes < 1 ||
      !/^[a-f0-9]{64}$/.test(item.sha256) ||
      !/^[a-f0-9]{64}$/.test(item.sourceSha256)
    )
      throw new Error(`Invalid media record for ${item.id}.`);
    if (
      item.truth !==
      (item.id === 'quiz-user-image-a-v1' ? 'manipulated' : 'authentic')
    )
      throw new Error(`Unexpected declared truth for ${item.id}.`);
    if (
      JSON.stringify(item.results.map((row) => row.model)) !==
      JSON.stringify(EXPECTED_MODELS[item.id])
    )
      throw new Error(`${item.id} has an unexpected detector set.`);
    item.results = item.results.map((row) => validateResult(row, item.sha256));
    const unavailable = item.unavailableDetectors ?? {};
    if (
      BOKEH_CASES.has(item.id)
        ? unavailable.gend !== 'requires-face' ||
          Object.keys(unavailable).length !== 1
        : Object.keys(unavailable).length !== 0
    )
      throw new Error(`Unexpected unavailable-detector record for ${item.id}.`);
  }
  return data;
}

export const userImageCasesData = () => validateUserImageCases(packaged);
export const userImageCase = (id: string) =>
  userImageCasesData().cases.find((item) => item.id === id) ?? null;
