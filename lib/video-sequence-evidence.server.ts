import packaged from './video-sequence-evidence.server.json';
import { type VideoSequenceEvidence } from './video-sequence-evidence';
import { validateVideoSequencePack } from './video-sequence-evidence-validation';

let validated: VideoSequenceEvidence[] | null = null;
export function videoSequenceEvidence(
  exerciseId: string,
): VideoSequenceEvidence | null {
  validated ??= validateVideoSequencePack(packaged);
  const record = validated.find((c) => c.exerciseId === exerciseId);
  return record ? structuredClone(record) : null;
}
