import { env } from 'cloudflare:workers';
import type { Exercise } from './domain';
import { quizQuestion } from './quiz-bank.server';
import { quizCandidate } from './quiz-bank';
import { configuredParticipantPasscode } from './participant-access';
import { requestPublicOrigin } from './public-origin';

export const bindings = () =>
  env as unknown as {
    DB: D1Database;
    FILES: R2Bucket;
    LOCAL_ADMIN_KEY?: string;
    WORKSHOP_OPEN_ACCESS?: string;
    WORKSHOP_PARTICIPANT_PASSCODE?: string;
    PUBLIC_ORIGIN?: string;
    PUBLIC_IP_ORIGIN?: string;
  };

export const db = () => bindings().DB;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(a)),
  );
  const right = new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(b)),
  );
  let difference = 0;
  for (let index = 0; index < left.length; index++)
    difference |= left[index] ^ right[index];
  return difference === 0;
}

export function hex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function cookie(request: Request, name: string) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(name + '='))
    ?.slice(name.length + 1);
}

export function publicOrigin(request: Request) {
  try {
    return requestPublicOrigin(request, bindings().PUBLIC_ORIGIN, bindings().PUBLIC_IP_ORIGIN);
  } catch {
    throw new HttpError(403, 'Invalid public request origin or origin configuration.');
  }
}

export function externalUrl(path: string, request: Request) {
  return new URL(path, `${publicOrigin(request)}/`);
}

export function setCookie(
  request: Request,
  name: string,
  value: string,
  maxAge = 86400,
) {
  const secure = new URL(publicOrigin(request)).protocol === 'https:';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== publicOrigin(request))
    throw new HttpError(403, 'Same-origin request required.');
}

export async function body(request: Request, max = 64000) {
  if (Number(request.headers.get('content-length')) > max)
    throw new HttpError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'JSON body required.');
  let length = 0;
  let raw = '';
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, 'Request is too large.');
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  raw += decoder.decode();
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

export type ParticipantSession = { id: string; nickname: string };

export function participantPasscode() {
  return configuredParticipantPasscode(
    bindings().WORKSHOP_PARTICIPANT_PASSCODE,
  );
}

export async function participantAccessTag() {
  const material = new TextEncoder().encode(
    `evidence-lab-participant-v1\0${participantPasscode()}`,
  );
  return hex(await crypto.subtle.digest('SHA-256', material));
}

export async function participantSession(
  request: Request,
): Promise<ParticipantSession | null> {
  const id = cookie(request, 'lab_participant');
  if (!id) return null;
  const row = await db()
    .prepare('SELECT id,nickname,access_tag FROM participants WHERE id=?')
    .bind(id)
    .first<{ id: string; nickname: string | null; access_tag: string | null }>();
  if (!row?.nickname || !row.access_tag) return null;
  if (!(await safeEqual(row.access_tag, await participantAccessTag())))
    return null;
  return { id: row.id, nickname: row.nickname };
}

export async function participant(request: Request) {
  const session = await participantSession(request);
  if (!session)
    throw new HttpError(401, 'Enter the website passcode first.');
  return session.id;
}

export async function exercise(id: string) {
  const row = await db()
    .prepare(
      'SELECT e.*, m.mime,m.bytes,m.sha256 FROM exercises e LEFT JOIN media m ON e.media_id=m.id WHERE e.id=?',
    )
    .bind(id)
    .first();
  if (!row) throw new HttpError(404, 'Exercise not found.');
  return row;
}

export function publicExercise(
  row: Record<string, unknown>,
  includePrivate = false,
): Exercise {
  const question = quizQuestion(String(row.id));
  return {
    id: String(row.id),
    title: String(row.title),
    prompt: String(row.prompt),
    kind: row.kind as Exercise['kind'],
    mediaId: row.media_id as string | null,
    mediaUrl: row.media_id ? `/api/media/${row.media_id}` : '',
    mime: String(row.mime || ''),
    bytes: Number(row.bytes || 0),
    sha256: String(row.sha256 || ''),
    tools: JSON.parse(String(row.tools)),
    published: !!row.published,
    revealed: !!row.revealed,
    placeholder: !!row.placeholder,
    revision: Number(row.revision),
    ...(question
      ? {
          quizQuestion: question,
          scenarioOnly: !!quizCandidate(String(row.id))?.scenario,
        }
      : {}),
    ...(includePrivate || row.revealed
      ? {
          truth: row.truth as Exercise['truth'],
          explanation: String(row.explanation),
        }
      : {}),
  };
}
