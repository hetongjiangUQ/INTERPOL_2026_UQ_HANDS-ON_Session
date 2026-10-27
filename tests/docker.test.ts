import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  renderRuntimeEnvironment,
  validateAdminKey,
  validateParticipantPasscode,
  validatePublicOrigin,
  validatePublicIpOrigin,
} from '../scripts/start-container.mjs';
import { generateEventPasscode } from '../scripts/prepare-docker-secrets.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('Docker build is pinned and the runtime contains only deployable output', () => {
  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /FROM node:22-bookworm-slim AS builder/);
  assert.match(dockerfile, /packageManager[\s\S]*pnpm@11\.19\.0/);
  assert.match(dockerfile, /pnpm install --frozen-lockfile/);
  assert.match(dockerfile, /pnpm run build/);
  assert.match(dockerfile, /ARG WRANGLER_VERSION=4\.92\.0/);
  assert.match(dockerfile, /COPY --from=builder[^\n]+\/build\/dist \.\/dist/);
  assert.doesNotMatch(
    dockerfile,
    /COPY --from=builder[^\n]+\/build\/(?:app|components|lib|public)/,
  );
  assert.match(dockerfile, /USER evidence-lab/);
  assert.match(dockerfile, /\/api\/health/);
});

test('Docker build context excludes secrets, local state and model artefacts', () => {
  const ignored = read('.dockerignore');
  for (const expected of [
    '.git',
    '.dev.vars*',
    'deploy/secrets/',
    'deploy/caddy-extra/*.caddy',
    'node_modules/',
    '.package-store/',
    '.wrangler/',
    'processor/',
    'research/',
    '**/._*',
    '**/__MACOSX/',
    '**/*.safetensors',
    '**/checkpoints/',
  ])
    assert.match(
      ignored,
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
});

test('Compose keeps one stateful app behind loopback by default', () => {
  const compose = read('compose.yaml');
  assert.match(compose, /WORKSHOP_OPEN_ACCESS: "false"/);
  assert.match(compose, /127\.0\.0\.1/);
  assert.match(compose, /evidence_lab_state:\/data\/wrangler/);
  assert.match(compose, /\/app\/\.wrangler:uid=10001,gid=10001,mode=0700/);
  assert.match(
    compose,
    /\/app\/dist\/server\/\.wrangler:uid=10001,gid=10001,mode=0700/,
  );
  assert.match(
    compose,
    /LOCAL_ADMIN_KEY_FILE: \/run\/secrets\/local_admin_key/,
  );
  assert.match(
    compose,
    /WORKSHOP_PARTICIPANT_PASSCODE_FILE: \/run\/secrets\/participant_passcode/,
  );
  assert.doesNotMatch(compose, /LOCAL_ADMIN_KEY:\s*\$/);
  assert.doesNotMatch(compose, /WORKSHOP_PARTICIPANT_PASSCODE:\s*\$/);
  assert.match(compose, /profiles:\n\s+- proxy/);
  assert.match(compose, /\/api\/health/);
  assert.match(
    compose,
    /source: \.\/public\/samples[\s\S]*target: \/srv\/samples[\s\S]*read_only: true[\s\S]*create_host_path: false/,
  );
  assert.doesNotMatch(compose, /replicas:/);
  assert.equal((compose.match(/driver: json-file/g) ?? []).length, 2);
  assert.equal((compose.match(/max-size: "10m"/g) ?? []).length, 2);
  assert.equal((compose.match(/max-file: "3"/g) ?? []).length, 2);
});

test('Caddy serves seekable public samples and proxies every other request', () => {
  const caddyfile = read('deploy/Caddyfile');
  assert.match(
    caddyfile,
    /handle \/samples\/\*[\s\S]*root \* \/srv[\s\S]*file_server/,
  );
  assert.match(
    caddyfile,
    /handle \{[\s\S]*encode zstd gzip[\s\S]*reverse_proxy app:3001/,
  );
  assert.doesNotMatch(caddyfile, /encode zstd gzip[\s\S]*handle \/samples\/\*/);
  assert.match(caddyfile, /reverse_proxy app:3001/);
});

test('container validation rejects unsafe deployment credentials and origins', () => {
  const key = '2f'.repeat(32);
  assert.equal(validateAdminKey(key), key);
  assert.equal(validateAdminKey('Example-Admin42!'), 'Example-Admin42!');
  for(const invalid of ['short', ' x'.repeat(12), 'x'.repeat(129), 'long-enough\nkey'])
    assert.throws(() => validateAdminKey(invalid), /12–128/);
  assert.throws(() => validateParticipantPasscode('a'), /8–64/);
  assert.throws(() => validateParticipantPasscode('change-me'), /placeholder/);
  assert.throws(
    () => validateParticipantPasscode(' short-pass '),
    /trimmed line/,
  );
  assert.equal(
    validateParticipantPasscode('event-code-4729'),
    'event-code-4729',
  );
  assert.equal(
    validatePublicOrigin('https://workshop.example.org/'),
    'https://workshop.example.org',
  );
  assert.equal(
    validatePublicOrigin('http://127.0.0.1:3001'),
    'http://127.0.0.1:3001',
  );
  assert.throws(
    () => validatePublicOrigin('http://workshop.example.org'),
    /HTTPS/,
  );
  assert.throws(
    () => validatePublicOrigin('https://workshop.example.org/path'),
    /only an http/,
  );
});

test('runtime env file is fail-closed and secrets do not enter Wrangler arguments', () => {
  const body = renderRuntimeEnvironment({
    adminKey: 'ab'.repeat(32),
    participantPasscode: 'audience-4827',
    publicOrigin: 'https://workshop.example.org',
    publicIpOrigin: 'https://192.0.2.10',
  });
  assert.match(body, /^WORKSHOP_OPEN_ACCESS=false$/m);
  assert.match(body, /^LOCAL_ADMIN_KEY="[0-9a-f]{64}"$/m);
  assert.match(body, /^WORKSHOP_PARTICIPANT_PASSCODE="audience-4827"$/m);
  assert.match(body, /^PUBLIC_IP_ORIGIN="https:\/\/192\.0\.2\.10"$/m);

  const entrypoint = read('scripts/start-container.mjs');
  assert.match(entrypoint, /CI:'true'/);
  assert.match(entrypoint, /--env-file',runtimeEnvironmentPath/);
  assert.doesNotMatch(
    entrypoint,
    /--(?:var|define)'[^\n]*(?:adminKey|participantPasscode)/,
  );
  const persistUses = entrypoint.match(/'--persist-to',persistPath/g) ?? [];
  assert.equal(persistUses.length, 3);
});

test('optional IP origin is HTTPS-only and the edge overwrites the origin header', () => {
  assert.equal(validatePublicIpOrigin(''), '');
  assert.equal(validatePublicIpOrigin(undefined), '');
  assert.equal(validatePublicIpOrigin('https://192.0.2.10'), 'https://192.0.2.10');
  assert.equal(validatePublicIpOrigin('https://[2001:db8::1]'), 'https://[2001:db8::1]');
  for (const bad of ['http://192.0.2.10', 'https://example.org', 'https://192.0.2.10/path'])
    assert.throws(() => validatePublicIpOrigin(bad));
  assert.match(read('compose.yaml'), /PUBLIC_IP_ORIGIN: "\$\{PUBLIC_IP_ORIGIN:-\}"/);
  assert.match(read('deploy/Caddyfile'), /header_up X-Evidence-Lab-Origin "\{scheme\}:\/\/\{host\}"/);
  assert.match(read('deploy/Caddyfile'), /import \/etc\/caddy\/extra\/\*\.caddy/);
  assert.match(read('deploy/ip-access.caddy.example'), /profile shortlived/);
  assert.match(read('deploy/ip-default-sni.caddy.example'), /default_sni \{\$SITE_IP\}/);
});

test('secret preparation uses a private host directory and container-readable files without printing values', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'evidence-lab-secrets-'));
  try {
    const first = spawnSync(
      process.execPath,
      [resolve(root, 'scripts/prepare-docker-secrets.mjs')],
      {
        encoding: 'utf8',
        env: { ...process.env, EVIDENCE_LAB_SECRETS_DIRECTORY: directory },
      },
    );
    assert.equal(first.status, 0, first.stderr);
    const admin = readFileSync(
      resolve(directory, 'local_admin_key.txt'),
      'utf8',
    ).trim();
    const passcode = readFileSync(
      resolve(directory, 'participant_passcode.txt'),
      'utf8',
    ).trim();
    assert.equal(admin, 'interpol2026');
    assert.equal(passcode, 'interpol2026');
    assert.doesNotMatch(first.stdout, new RegExp(admin));
    assert.doesNotMatch(first.stdout, new RegExp(passcode));
    assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.equal(
      statSync(resolve(directory, 'local_admin_key.txt')).mode & 0o777,
      0o644,
    );
    assert.equal(
      statSync(resolve(directory, 'participant_passcode.txt')).mode & 0o777,
      0o644,
    );

    const second = spawnSync(
      process.execPath,
      [resolve(root, 'scripts/prepare-docker-secrets.mjs')],
      {
        encoding: 'utf8',
        env: { ...process.env, EVIDENCE_LAB_SECRETS_DIRECTORY: directory },
      },
    );
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /Refusing to overwrite/);
    assert.equal(
      readFileSync(resolve(directory, 'local_admin_key.txt'), 'utf8').trim(),
      admin,
    );
    assert.equal(
      readFileSync(
        resolve(directory, 'participant_passcode.txt'),
        'utf8',
      ).trim(),
      passcode,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('generated event passcodes satisfy the deployment validator', () => {
  for (let index = 0; index < 20; index++)
    assert.equal(
      validateParticipantPasscode(generateEventPasscode()).length,
      12,
    );
});
