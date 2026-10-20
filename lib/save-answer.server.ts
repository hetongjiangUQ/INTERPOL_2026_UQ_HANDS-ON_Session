import {validateAnswer} from './answer-options.ts';

/** One atomic save; preserve historical initial judgements and notes on updates. */
export async function saveAnswer(db:D1Database, pid:string, id:string, input:Record<string,unknown>, workshopRevision:number, allowRevision:boolean) {
  const answer=validateAnswer(id,input.verdict,input.selections);
  const result=await db.prepare(`INSERT INTO assessments
    (participant_id,exercise_id,initial,initial_confidence,initial_notes,reconsidered_response,updated_at)
    SELECT ?,?,?,NULL,'',?,? WHERE EXISTS
    (SELECT 1 FROM exercises WHERE id=? AND published=1 AND revealed=0 AND revision=?)
    AND ?=(SELECT COALESCE(MAX(revision),0) FROM workshop_config_versions)
    ON CONFLICT(participant_id,exercise_id) DO UPDATE SET
    reconsidered_response=excluded.reconsidered_response,updated_at=excluded.updated_at
    WHERE assessments.reconsidered_response IS NULL OR ?=1`)
    .bind(pid,id,answer.verdict,JSON.stringify(answer.response),new Date().toISOString(),id,input.revision,workshopRevision,allowRevision?1:0).run();
  return !!result.meta.changes;
}
