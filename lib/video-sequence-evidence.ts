export const VIDEO_SEQUENCE_METHODS = {
  d3: { name: 'D3', task: 'fully generated video' },
  'pwtf-dvd': { name: 'PwTF-DVD', task: 'temporal face forgery' },
} as const;

export type VideoSequenceMethod = keyof typeof VIDEO_SEQUENCE_METHODS;

export const VIDEO_SEQUENCE_METHOD_ORDER = [
  'd3',
  'pwtf-dvd',
] as const satisfies readonly VideoSequenceMethod[];

export const VIDEO_SEQUENCE_CASE_METHODS = {
  'quiz-video-authentic-hard': ['d3', 'pwtf-dvd'],
  'quiz-video-synthetic-hard': ['d3', 'pwtf-dvd'],
  'quiz-faceswap-video-v1': ['d3', 'pwtf-dvd'],
  'quiz-faceswap-video-v2': ['d3', 'pwtf-dvd'],
} as const satisfies Record<string, readonly VideoSequenceMethod[]>;

export function videoSequenceMethods(
  exerciseId: string,
): readonly VideoSequenceMethod[] {
  return exerciseId in VIDEO_SEQUENCE_CASE_METHODS
    ? VIDEO_SEQUENCE_METHOD_ORDER
    : [];
}

const VIDEO_SEQUENCE_WORKSHOP_COMPARISONS: Record<
  string,
  Partial<
    Record<
      VideoSequenceMethod,
      {
        comparisonRawScore: number;
        comparisonLabel: string;
        resultMeaning: string;
      }
    >
  >
> = {
  'quiz-faceswap-video-v2': {
    'pwtf-dvd': {
      comparisonRawScore: 0.0014261669387261187,
      comparisonLabel: 'authentic workshop video',
      resultMeaning: 'more face-forgery-like',
    },
  },
  'quiz-video-authentic-hard': {
    d3: {
      comparisonRawScore: 0.6578940749168396,
      comparisonLabel: 'fully generated workshop video',
      resultMeaning: 'more real-like',
    },
    'pwtf-dvd': {
      comparisonRawScore: 0.5936067346781587,
      comparisonLabel: 'previous face-swap reference video',
      resultMeaning: 'less face-forgery-like',
    },
  },
  'quiz-video-synthetic-hard': {
    d3: {
      comparisonRawScore: 5.080155849456787,
      comparisonLabel: 'authentic workshop video',
      resultMeaning: 'more generated-like',
    },
  },
  'quiz-faceswap-video-v1': {
    'pwtf-dvd': {
      comparisonRawScore: 0.0014261669387261187,
      comparisonLabel: 'authentic workshop video',
      resultMeaning: 'more face-forgery-like',
    },
  },
};

const VIDEO_SEQUENCE_CROSS_TASK_EXPLANATIONS: Record<
  string,
  Partial<Record<VideoSequenceMethod, string>>
> = {
  'quiz-faceswap-video-v2': {
    d3: "this face-swap case is outside D3's fully generated-video task, so no authentic/generated comparison is valid",
  },
  'quiz-video-synthetic-hard': {
    'pwtf-dvd':
      "this fully generated case is outside PwTF-DVD's face-forgery task, so no authentic/face-swap comparison is valid",
  },
  'quiz-faceswap-video-v1': {
    d3: "this face-swap case is outside D3's fully generated-video task, so no authentic/generated comparison is valid",
  },
};

export type VideoSequenceResultScope = 'primary-task' | 'outside-primary-task';

type CommonResult = {
  method: VideoSequenceMethod;
  rawScore: number;
  scoreLabel: string;
  direction: string;
  interpretation: string;
  limitations: string;
  scope?: VideoSequenceResultScope;
  scopeNote?: string;
  repositoryRevision: string;
  sourceResultSha256: string;
  runnerSha256: string;
};

export type D3Result = CommonResult & {
  method: 'd3';
  encoder: string;
  encoderRevision: string;
  framesSampled: number;
  samplingFps: number;
  sampleStartSeconds: number;
  approximateCoverageSeconds: number;
  inferenceSeconds: number;
};

export type PwtfResult = CommonResult & {
  method: 'pwtf-dvd';
  decodedFrames: number;
  faceTracks: number;
  clipCount: number;
  clipFrames: number;
  clipStride: number;
};

export type VideoSequenceResult = D3Result | PwtfResult;

export type VideoSequenceEvidence = {
  schemaVersion: 1;
  exerciseId: string;
  mediaSha256: string;
  computedDate: string;
  run: {
    summarySha256: string;
    gpu: string;
    gpuMemoryMiB: number;
    driver: string;
  };
  results: VideoSequenceResult[];
};

function formatNativeScore(method: VideoSequenceMethod, value: number): string {
  return value.toFixed(method === 'd3' ? 4 : 6);
}

export function videoSequenceAudienceSummary(
  exerciseId: string,
  result: VideoSequenceResult,
): string {
  const methodName = VIDEO_SEQUENCE_METHODS[result.method].name;

  if (result.scope === 'outside-primary-task') {
    const explanation =
      VIDEO_SEQUENCE_CROSS_TASK_EXPLANATIONS[exerciseId]?.[result.method] ??
      `this case is outside ${methodName}'s primary task, so no comparison is valid`;
    return `${methodName} raw value: ${formatNativeScore(result.method, result.rawScore)}—${explanation}.`;
  }

  const comparison =
    VIDEO_SEQUENCE_WORKSHOP_COMPARISONS[exerciseId]?.[result.method];
  if (!comparison) {
    return `${methodName} raw value: ${formatNativeScore(result.method, result.rawScore)}. Compare it only with videos tested for the same task.`;
  }

  const difference = Math.abs(result.rawScore - comparison.comparisonRawScore);
  const relation =
    result.rawScore >= comparison.comparisonRawScore ? 'higher' : 'lower';
  return `${methodName}: ${formatNativeScore(result.method, result.rawScore)} versus ${formatNativeScore(result.method, comparison.comparisonRawScore)} for the ${comparison.comparisonLabel} — ${formatNativeScore(result.method, difference)} ${relation} on ${methodName}'s own scale, so this is the ${comparison.resultMeaning} result in this pair.`;
}
