import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORKSHOP_PARTICIPANT_PASSCODE,
  configuredParticipantPasscode,
  normaliseParticipantNickname,
} from '../lib/participant-access.ts';

test('participant nicknames are trimmed and NFC-normalised without changing valid pseudonyms', () => {
  assert.equal(normaliseParticipantNickname('  Jose\u0301  '), 'José');
  assert.equal(
    normaliseParticipantNickname('Avery 👩‍💻'),
    'Avery 👩‍💻',
  );
});

test('participant nicknames use a one-to-forty Unicode code-point boundary', () => {
  assert.equal(normaliseParticipantNickname('x'), 'x');
  assert.equal(normaliseParticipantNickname('😀'.repeat(40)), '😀'.repeat(40));
  assert.throws(() => normaliseParticipantNickname('   '), /nickname/i);
  assert.throws(() => normaliseParticipantNickname('x'.repeat(41)), /40/);
  assert.throws(() => normaliseParticipantNickname('😀'.repeat(41)), /40/);
  assert.throws(() => normaliseParticipantNickname(null), /nickname/i);
});

test('participant nicknames reject controls and bidirectional formatting characters', () => {
  for (const value of [
    'line\nbreak',
    'tab\tname',
    'null\u0000name',
    'right\u202eto-left',
    'isolate\u2066name',
  ]) {
    assert.throws(() => normaliseParticipantNickname(value), /character/i);
  }
});

test('the temporary participant passcode default is exact and environment-overridable', () => {
  assert.equal(DEFAULT_WORKSHOP_PARTICIPANT_PASSCODE, 'a');
  assert.equal(configuredParticipantPasscode(), 'a');
  assert.equal(configuredParticipantPasscode(''), 'a');
  assert.equal(configuredParticipantPasscode('A'), 'A');
  assert.equal(configuredParticipantPasscode('Talk-2026'), 'Talk-2026');
  assert.notEqual(configuredParticipantPasscode('A'), configuredParticipantPasscode('a'));
});
