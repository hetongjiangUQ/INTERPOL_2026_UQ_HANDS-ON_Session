export const DEFAULT_WORKSHOP_PARTICIPANT_PASSCODE = 'a';

const unsupportedNicknameCharacters =
  /[\p{Cc}\p{Zl}\p{Zp}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

export function normaliseParticipantNickname(value: unknown) {
  if (typeof value !== 'string') throw new Error('Enter a nickname.');
  const nickname = value.normalize('NFC').trim();
  if (!nickname) throw new Error('Enter a nickname.');
  if (Array.from(nickname).length > 40)
    throw new Error('Nickname must be 40 characters or fewer.');
  if (unsupportedNicknameCharacters.test(nickname))
    throw new Error('Nickname contains unsupported characters.');
  return nickname;
}

export function configuredParticipantPasscode(value?: string) {
  return value === undefined || value === ''
    ? DEFAULT_WORKSHOP_PARTICIPANT_PASSCODE
    : value;
}
