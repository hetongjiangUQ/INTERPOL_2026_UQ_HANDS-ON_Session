import {reconsideredResponse, type ReconsideredSelection, type Verdict} from './domain.ts';

// Visible subject matter, never the hidden source label or detector result.
export function answerOptions(id: string): ReconsideredSelection[] {
  return ['quiz-first-look', 'quiz-image-five', 'quiz-user-image-b-v2'].includes(id)
    ? ['authentic_capture', 'photo_edited', 'synthetic_generation']
    : ['authentic_capture', 'face_swap', 'synthetic_generation'];
}
export function visibleAnswerOptions(id: string, choice: Verdict | null) {
  return answerOptions(id).filter(option => choice === null ||
    (choice === 'authentic' ? option === 'authentic_capture' : option !== 'authentic_capture'));
}
export function validateAnswer(id: string, choice: unknown, selections: unknown) {
  if (choice !== 'authentic' && choice !== 'manipulated') throw new Error('Choose authentic or AI-generated/manipulated.');
  const response = reconsideredResponse({schemaVersion:1,selections});
  const allowed = visibleAnswerOptions(id,choice);
  if (response.selections.some(s => !allowed.includes(s))) throw new Error('The classifications do not match this answer or media type.');
  return {verdict:choice, response};
}
