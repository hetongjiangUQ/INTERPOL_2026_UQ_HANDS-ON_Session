import packaged from './controlled-video-detectors.server.json' with {type:'json'};
import {validateResult} from './domain.ts';
import {QUIZ8_TOOLS} from './quiz8-replacement.ts';
/** Exact-file measured evidence; historical v1 remains separate. */
export const controlledVideo = {
  id: 'quiz-faceswap-video-v2',
  mediaId: 'controlled-mouth-preserve-video-v2',
  title: 'Has this portrait video been manipulated?',
  url: '/samples/faceswap/portrait-call-v2.mp4',
  mime: 'video/mp4',
  bytes: 279124,
  sha256: 'ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632',
  explanation: 'Controlled face swap: a fictional adult portrait generated with local Z-Image-Turbo was transferred onto the consenting presenter’s own recorded video using FaceFusion 3.8.2 HyperSwap 1a. Native region masking excludes the mouth and lips; the original recorded speech is unchanged. The result was resized to 640×602 and compressed to simulate call quality, not captured from a conferencing platform. Six image classifiers were run on eight sampled frames; D3 and PwTF-DVD were run separately on this exact derivative. Scores do not establish authenticity. Processing records are not signed provenance or independent forensic verification.',
};

export function controlledVideoResults() {
  const results = packaged.results.map(r => validateResult(r, controlledVideo.sha256));
  if (JSON.stringify(results.map(r => r.model)) !== JSON.stringify(QUIZ8_TOOLS.slice(1)) || results.some(r => r.samples?.length !== 8)) throw new Error('Incomplete Quiz 8 evidence.');
  return results;
}

export async function ensureControlledVideo(db: D1Database) {
  const c = controlledVideo;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)')
      .bind(c.mediaId, 'bundled:' + c.url, c.mime, c.bytes, c.sha256, now),
    db.prepare('INSERT OR IGNORE INTO exercises(id,title,prompt,kind,media_id,tools,truth,explanation,published,revealed,placeholder,revision,created_at) VALUES (?,?,?,?,?,?,?,?,1,0,0,1,?)')
      .bind(c.id, c.title, 'Inspect the complete clip and record your assessment.', 'video', c.mediaId, JSON.stringify(QUIZ8_TOOLS), 'manipulated', c.explanation, now),
    db.prepare('UPDATE exercises SET tools=?,explanation=? WHERE id=? AND media_id=? AND EXISTS (SELECT 1 FROM media WHERE id=? AND sha256=?) AND (tools<>? OR explanation<>?)')
      .bind(JSON.stringify(QUIZ8_TOOLS), c.explanation, c.id, c.mediaId, c.mediaId, c.sha256, JSON.stringify(QUIZ8_TOOLS), c.explanation),
    ...controlledVideoResults().map(r => db.prepare('INSERT OR IGNORE INTO detector_results(exercise_id,model,result) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM exercises e JOIN media m ON m.id=e.media_id WHERE e.id=? AND m.sha256=?)')
      .bind(c.id, r.model, JSON.stringify(r), c.id, c.sha256)),
  ]);
}
