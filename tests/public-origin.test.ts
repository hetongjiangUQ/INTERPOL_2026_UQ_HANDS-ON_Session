import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicOrigin, requestPublicOrigin } from '../lib/public-origin.ts';

const primary = 'https://workshop.example.org';
const secondary = 'https://192.0.2.10';
const request = (edge?: string, origin?: string) => new Request('http://app:3001/api/join', {
  headers: { ...(edge ? { 'X-Evidence-Lab-Origin': edge } : {}), ...(origin ? { Origin: origin } : {}) },
});

test('domain and IP keep their own URLs, Secure cookies and exact same-origin checks', () => {
  for (const site of [primary, secondary]) {
    const incoming = request(site, site);
    const resolved = requestPublicOrigin(incoming, primary, secondary);
    assert.equal(resolved, site);
    assert.equal(incoming.headers.get('origin'), resolved);
    assert.equal(new URL(resolved).protocol, 'https:');
    assert.equal(new URL('/samples/video/example.mp4', resolved).origin, site);
    assert.notEqual(request(site, site === primary ? secondary : primary).headers.get('origin'), resolved);
  }
});

test('internal probes default to primary; development still uses its request URL', () => {
  assert.equal(requestPublicOrigin(request(), primary, secondary), primary);
  assert.equal(requestPublicOrigin(new Request('http://localhost:3001/')), 'http://localhost:3001');
});

test('origin cannot come from an arbitrary host, forwarded header or client Origin', () => {
  for (const untrusted of ['https://evil.example', 'http://192.0.2.10', `${primary}, ${secondary}`, `${secondary}/`])
    assert.throws(() => requestPublicOrigin(request(untrusted), primary, secondary), /Unrecognised/);
  assert.throws(() => requestPublicOrigin(request(secondary), primary), /Unrecognised/);
  const incoming = new Request('http://evil.example/', { headers: { 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'https', Origin: secondary } });
  assert.equal(requestPublicOrigin(incoming, primary, secondary), primary);
});

test('configured origins cannot contain credentials, paths, queries or fragments', () => {
  for (const invalid of ['https://user:secret@example.org', 'https://example.org/path', 'https://example.org/?a=1', 'https://example.org/#x', 'file:///tmp/test'])
    assert.throws(() => parsePublicOrigin(invalid));
});
