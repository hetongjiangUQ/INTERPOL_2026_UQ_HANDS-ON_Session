import type { WorkshopConfig } from './workshop-config.ts';
export const QUIZ8_TOOLS = ['timeline', 'univfd', 'community', 'spai', 'aide', 'gend', 'fatformer'] as const;

/** Versioned replacement: old media, answers and scores retain their old ID. */
export function replaceRetiredQuiz8(config: WorkshopConfig): WorkshopConfig {
  const hasNew = config.practices.some(p => p.id === 'quiz-faceswap-video-v2');
  return { ...config, practices: config.practices
    .filter(p => !(hasNew && p.id === 'quiz-faceswap-video-v1'))
    .map(p => ['quiz-faceswap-video-v1', 'quiz-faceswap-video-v2'].includes(p.id)
      ? { ...p, id: 'quiz-faceswap-video-v2', tools: [...QUIZ8_TOOLS] }
      : p.id === 'quiz-first-look'
        ? {...p, tools: [...new Set([...p.tools, 'univfd', 'community', 'spai', 'aide'] as const)]}
        : p) };
}
