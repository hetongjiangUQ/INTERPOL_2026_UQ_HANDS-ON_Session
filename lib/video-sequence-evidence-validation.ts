import {
  VIDEO_SEQUENCE_CASE_METHODS,
  VIDEO_SEQUENCE_METHODS,
  type VideoSequenceEvidence,
  type VideoSequenceMethod,
  type VideoSequenceResult,
} from './video-sequence-evidence.ts';

type Pack = {
  schemaVersion: number;
  computedDate: string;
  run: VideoSequenceEvidence['run'];
  cases: Array<{
    exerciseId: string;
    mediaSha256: string;
    results: VideoSequenceResult[];
    computedDate?: string;
    run?: VideoSequenceEvidence['run'];
  }>;
};
const sha = /^[a-f0-9]{64}$/;
const revision = /^[a-f0-9]{40}$/;
const allowedCases = new Set(Object.keys(VIDEO_SEQUENCE_CASE_METHODS));
const mediaHashes: Record<string, string> = {
  'quiz-faceswap-video-v2': 'ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632',
  'quiz-video-authentic-hard':
    '7d4cc1bf7325dfd2222fd5194c05cc07ca194436489c2de53a75c0961429c036',
  'quiz-video-synthetic-hard':
    'd557d12335e607e4fe9f05655ac6865762ac9a97596eb9f06aaec8685ba13df5',
  'quiz-faceswap-video-v1':
    '5d716680050e2c459b5bf0d30449689512dfa9f44510a157e2b4a73479a36f42',
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateVideoSequencePack(
  input: unknown,
): VideoSequenceEvidence[] {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid video-sequence evidence package.');
  const pack = input as Pack;
  if (
    pack.schemaVersion !== 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(pack.computedDate) ||
    !pack.run ||
    !sha.test(pack.run.summarySha256) ||
    !text(pack.run.gpu) ||
    !Number.isInteger(pack.run.gpuMemoryMiB) ||
    pack.run.gpuMemoryMiB <= 0 ||
    !text(pack.run.driver) ||
    !Array.isArray(pack.cases)
  )
    throw new Error('Invalid video-sequence package metadata.');
  const seenCases = new Set<string>();
  const cases = pack.cases.map((c) => {
    const computedDate = c.computedDate ?? pack.computedDate;
    const run = c.run ?? pack.run;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(computedDate) || !run || !sha.test(run.summarySha256) || !text(run.gpu) || !text(run.driver) || !Number.isInteger(run.gpuMemoryMiB) || run.gpuMemoryMiB <= 0) throw new Error('Invalid case execution metadata.');
    if (
      !allowedCases.has(c.exerciseId) ||
      seenCases.has(c.exerciseId) ||
      !sha.test(c.mediaSha256) ||
      c.mediaSha256 !== mediaHashes[c.exerciseId] ||
      !Array.isArray(c.results) ||
      c.results.length === 0
    )
      throw new Error('Invalid video-sequence case.');
    seenCases.add(c.exerciseId);
    const expected = [
      ...VIDEO_SEQUENCE_CASE_METHODS[
        c.exerciseId as keyof typeof VIDEO_SEQUENCE_CASE_METHODS
      ],
    ];
    const seenMethods = new Set<VideoSequenceMethod>();
    for (const result of c.results) {
      if (
        !(result.method in VIDEO_SEQUENCE_METHODS) ||
        seenMethods.has(result.method) ||
        !finite(result.rawScore) ||
        result.rawScore < 0 ||
        !text(result.scoreLabel) ||
        !text(result.direction) ||
        !text(result.interpretation) ||
        !text(result.limitations) ||
        (result.scope !== undefined &&
          !['primary-task', 'outside-primary-task'].includes(result.scope)) ||
        (result.scopeNote !== undefined && !text(result.scopeNote)) ||
        (result.scope === 'outside-primary-task' && !text(result.scopeNote)) ||
        !revision.test(result.repositoryRevision) ||
        !sha.test(result.sourceResultSha256) ||
        !sha.test(result.runnerSha256)
      )
        throw new Error('Invalid video-sequence result.');
      seenMethods.add(result.method);
      if (result.method === 'd3') {
        if (
          !text(result.encoder) ||
          !revision.test(result.encoderRevision) ||
          !Number.isInteger(result.framesSampled) ||
          result.framesSampled <= 0 ||
          !finite(result.samplingFps) ||
          result.samplingFps <= 0 ||
          !finite(result.sampleStartSeconds) ||
          result.sampleStartSeconds < 0 ||
          !finite(result.approximateCoverageSeconds) ||
          result.approximateCoverageSeconds <= 0 ||
          !finite(result.inferenceSeconds) ||
          result.inferenceSeconds < 0
        )
          throw new Error('Invalid D3 result.');
      } else if (result.method === 'pwtf-dvd') {
        if (
          result.rawScore > 1 ||
          ![
            result.decodedFrames,
            result.faceTracks,
            result.clipCount,
            result.clipFrames,
            result.clipStride,
          ].every((v) => Number.isInteger(v) && v > 0)
        )
          throw new Error('Invalid PwTF-DVD result.');
      }
    }
    if (
      expected.length !== seenMethods.size ||
      expected.some((method) => !seenMethods.has(method))
    )
      throw new Error(
        'Video-sequence method set does not match the approved case mapping.',
      );
    return {
      schemaVersion: 1 as const,
      exerciseId: c.exerciseId,
      mediaSha256: c.mediaSha256,
      computedDate,
      run: { ...run },
      results: structuredClone(c.results),
    };
  });
  if (cases.length !== allowedCases.size)
    throw new Error('Video-sequence evidence package is incomplete.');
  return cases;
}
