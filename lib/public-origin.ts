// Caddy overwrites this header. Port 3001 must remain private. Never accept an
// arbitrary Host, Forwarded or X-Forwarded-* value as a public application URL.
export const PUBLIC_ORIGIN_HEADER = 'x-evidence-lab-origin';

export function parsePublicOrigin(value: string) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) throw new Error('Public origins must contain only an HTTP(S) scheme and host.');
  return url.origin;
}

export function requestPublicOrigin(
  request: Request,
  primary?: string,
  additional?: string,
) {
  if (!primary?.trim()) return new URL(request.url).origin;
  const canonical = parsePublicOrigin(primary.trim());
  const allowed = new Set([canonical]);
  if (additional?.trim()) allowed.add(parsePublicOrigin(additional.trim()));
  const edgeOrigin = request.headers.get(PUBLIC_ORIGIN_HEADER);
  // Internal health checks have no edge header; retain the canonical default.
  if (edgeOrigin === null) return canonical;
  if (!allowed.has(edgeOrigin)) throw new Error('Unrecognised public request origin.');
  return edgeOrigin;
}
