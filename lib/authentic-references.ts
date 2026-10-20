import type { Exercise } from './domain';

// These are manual comparison references, never scored or submitted as quizzes.
export const AUTHENTIC_REFERENCES: { label: string; note: string; exercise: Exercise }[] = [
  {
    label: 'Item reference',
    note: 'Presenter-supplied authentic item photo · 502 × 501 PNG.',
    exercise: {
      id: 'reference-authentic-item', title: 'Authentic item reference',
      mediaUrl: '/experiments/watermark-888-500.png',
      sha256: '5106e8e1ebace1e6f2f117c52e62d07cf0c57095a5c9fb8d523557133ce7bb8e',
      bytes: 436401, mime: 'image/png', kind: 'image', tools: [],
      prompt: '', mediaId: null, published: false, revealed: false,
      placeholder: false, revision: 1,
    },
  },
  {
    label: 'Portrait reference',
    note: 'Presenter-supplied authentic portrait · resized to 2,048 pixels wide and saved as PNG. Resizing can change fine detail.',
    exercise: {
      id: 'reference-authentic-portrait', title: 'Authentic portrait reference',
      mediaUrl: '/samples/references/authentic-portrait.png',
      sha256: '224d0edb89671fde87ce7a89f5941509c29e1a0b3d6b203b3a206835ac935bd1',
      bytes: 2040890, mime: 'image/png', kind: 'image', tools: [],
      prompt: '', mediaId: null, published: false, revealed: false,
      placeholder: false, revision: 1,
    },
  },
];
