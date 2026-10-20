/** Presentation frame only; never changes cached detector input or scores. */
export function inspectionFrameTime(exerciseId: string, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Video duration is unavailable.');
  return exerciseId === 'quiz-video-synthetic-hard'
    ? Math.max(0, duration - 0.5)
    : duration / 2;
}
