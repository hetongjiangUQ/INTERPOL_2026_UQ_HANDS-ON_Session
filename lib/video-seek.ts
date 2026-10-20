export function finiteVideoDuration(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function clampVideoTime(value: number, duration: number) {
  const maximum = finiteVideoDuration(duration);
  if (!maximum || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, maximum));
}

export function formatVideoTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const tenths = Math.floor(safe * 10);
  const minutes = Math.floor(tenths / 600);
  const remaining = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${remaining}`;
}
