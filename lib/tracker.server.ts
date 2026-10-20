import {TRACKER_KEY} from './tracker-key.server.ts';
import {quizCandidate} from './quiz-bank.ts';
import {validateAnswer} from './answer-options.ts';
import {parseReconsideredResponse,type ReconsideredSelection} from './domain.ts';

export type TrackerQuestion={id:string;title:string;sha256:string;selections:ReconsideredSelection[];basis:string};
type State={run_id:string|null;started_at:string|null;revealed:number;workshop_revision:number|null;answer_key:string|null};
export type GradedAnswer={id:string;selections:ReconsideredSelection[];correct:boolean};
export const trackerState=(db:D1Database)=>db.prepare('SELECT * FROM tracker_state WHERE id=1').first<State>();
const keyOf=(s:State|null):TrackerQuestion[]=>JSON.parse(s?.answer_key??'[]');
export const exactMatch=(a:string[],b:string[])=>a.length===b.length && a.every(x=>b.includes(x));
export async function buildTrackerKey(db:D1Database, ids:string[]) {
 if(ids.length!==10 || new Set(ids).size!==10)throw new Error('Select the ten workshop quizzes before starting the tracker.');
 const {results}=await db.prepare('SELECT e.id,e.title,e.published,e.revealed,e.truth,m.sha256 FROM exercises e JOIN media m ON m.id=e.media_id').all<{id:string;title:string;published:number;revealed:number;truth:string;sha256:string}>();
 return ids.map(id=>{
  const source=TRACKER_KEY[id],row=results.find(r=>r.id===id);
  if(!source||!row||row.sha256!==source.sha256||!row.published||row.revealed||row.truth!==(source.selections.includes('authentic_capture')?'authentic':'manipulated'))throw new Error('Answer key or media needs review before starting: '+id);
  return {id,title:quizCandidate(id)?.title??row.title,...source};
 });
}
export async function startTracker(db:D1Database, key:TrackerQuestion[], revision:number){
 const existing=await trackerState(db);
 if(existing?.run_id)return; // Double-click/retry does not restart the clock.
 const result=await db.prepare(`UPDATE tracker_state SET run_id=?,started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),answer_key=?,workshop_revision=?,revealed=0
 WHERE id=1 AND run_id IS NULL AND ?=(SELECT COALESCE(MAX(revision),0) FROM workshop_config_versions)`)
 .bind(crypto.randomUUID(),JSON.stringify(key),revision,revision).run();
 if(!result.meta.changes&&!(await trackerState(db))?.run_id)throw new Error('Session settings changed. Refresh before starting.');
}
export async function trackerStatus(db:D1Database,pid:string){
 const state=await trackerState(db),key=keyOf(state);
 const submission=await db.prepare('SELECT score,total,submitted_at FROM tracker_submissions WHERE participant_id=? AND run_id=?').bind(pid,state?.run_id??'').first<{score:number;total:number;submitted_at:string}>();
 const {results}=await db.prepare('SELECT exercise_id,reconsidered_response,updated_at FROM assessments WHERE participant_id=?').bind(pid).all<{exercise_id:string;reconsidered_response:string;updated_at:string}>();
 const completed=key.filter(q=>{
  const a=results.find(r=>r.exercise_id===q.id),r=parseReconsideredResponse(a?.reconsidered_response);
  if(!r||!a||a.updated_at<(state?.started_at??''))return false;
  try{validateAnswer(q.id,r.selections.includes('authentic_capture')?'authentic':'manipulated',r.selections);return true;}catch{return false;}
 }).map(q=>q.id);
 return {draftScope:pid,started:!!state?.run_id,runId:state?.run_id??null,startedAt:state?.started_at??null,revealed:!!state?.revealed,completed,total:key.length||10,
  submitted:!!submission,submittedAt:submission?.submitted_at??null,
  ...(state?.revealed&&submission?{score:submission.score}:{}),
 };
}
export async function submitTracker(db:D1Database,pid:string,runId:unknown,payload?:unknown,revision?:unknown){
 const state=await trackerState(db);
 if(!state?.run_id || runId!==state.run_id)throw new Error('The tracker has not started or the session changed. Refresh and try again.');
 const existing=await db.prepare('SELECT participant_id FROM tracker_submissions WHERE participant_id=? AND run_id=?').bind(pid,state.run_id).first();
 if(existing)return trackerStatus(db,pid); // Immutable original timestamp, even on retries.
 if(state.revealed)throw new Error('Results have been revealed. Submissions are closed.');
 const key=keyOf(state);
 if(payload!==undefined){
  if(revision!==state.workshop_revision||!Array.isArray(payload)||payload.length!==key.length||new Set(payload.map(a=>a?.id)).size!==key.length)throw new Error('Submit all current quizzes. Refresh if the session has changed.');
  const answers:GradedAnswer[]=key.map(q=>{
   const a=payload.find(a=>a?.id===q.id);
   if(!a||!Number.isInteger(a.revision))throw new Error('Missing or invalid quiz answer.');
   const validated=validateAnswer(q.id,a.verdict,a.selections);
   return {id:q.id,selections:validated.response.selections,correct:exactMatch(validated.response.selections,q.selections)};
  });
  const guards=key.map(()=>`EXISTS(SELECT 1 FROM exercises e JOIN media m ON m.id=e.media_id WHERE e.id=? AND e.revision=? AND e.published=1 AND e.revealed=0 AND m.sha256=?)`).join(' AND ');
  const args=key.flatMap(q=>[q.id,payload.find(a=>a.id===q.id).revision,q.sha256]);
  const result=await db.prepare(`INSERT OR IGNORE INTO tracker_submissions(participant_id,run_id,nickname,score,total,answers,submitted_at)
   SELECT id,?,nickname,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM participants WHERE id=?
   AND EXISTS(SELECT 1 FROM tracker_state WHERE id=1 AND run_id=? AND revealed=0 AND workshop_revision=? AND workshop_revision=(SELECT COALESCE(MAX(revision),0) FROM workshop_config_versions)) AND ${guards}`)
   .bind(state.run_id,answers.filter(a=>a.correct).length,key.length,JSON.stringify(answers),pid,state.run_id,revision,...args).run();
  if(!result.meta.changes&&!(await db.prepare('SELECT 1 FROM tracker_submissions WHERE participant_id=? AND run_id=?').bind(pid,state.run_id).first()))throw new Error('Session or media changed. Refresh before submitting.');
  return trackerStatus(db,pid);
 }
 const {results}=await db.prepare('SELECT exercise_id,reconsidered_response,updated_at FROM assessments WHERE participant_id=?').bind(pid).all<{exercise_id:string;reconsidered_response:string;updated_at:string}>();
 const answers:GradedAnswer[]=key.map(q=>{
  const row=results.find(r=>r.exercise_id===q.id),r=parseReconsideredResponse(row?.reconsidered_response);
  if(!r||!row||row.updated_at<state.started_at!)throw new Error('Save an answer for every quiz after the tracker starts.');
  validateAnswer(q.id,r.selections.includes('authentic_capture')?'authentic':'manipulated',r.selections);
  return {id:q.id,selections:r.selections,correct:exactMatch(r.selections,q.selections)};
 });
 // Compare-and-insert binds the grade to the answers read above, current run,
 // selected media and revision in ONE statement. Concurrent edits must retry.
 const guards=key.map(()=>`EXISTS(SELECT 1 FROM assessments a JOIN exercises e ON e.id=a.exercise_id JOIN media m ON m.id=e.media_id WHERE a.participant_id=? AND a.exercise_id=? AND a.reconsidered_response=? AND a.updated_at>=? AND e.published=1 AND e.revealed=0 AND m.sha256=?)`).join(' AND ');
 const args=key.flatMap(q=>[pid,q.id,results.find(r=>r.exercise_id===q.id)!.reconsidered_response,state.started_at,q.sha256]);
 const saved=await db.prepare(`INSERT OR IGNORE INTO tracker_submissions(participant_id,run_id,nickname,score,total,answers,submitted_at)
 SELECT id,?,?,?, ?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM participants WHERE id=?
 AND EXISTS(SELECT 1 FROM tracker_state WHERE id=1 AND run_id=? AND revealed=0 AND workshop_revision=(SELECT COALESCE(MAX(revision),0) FROM workshop_config_versions)) AND ${guards}`)
 .bind(state.run_id,(await db.prepare('SELECT nickname FROM participants WHERE id=?').bind(pid).first<{nickname:string}>())?.nickname??'',answers.filter(a=>a.correct).length,key.length,JSON.stringify(answers),pid,state.run_id,...args).run();
 if(!saved.meta.changes && !(await db.prepare('SELECT 1 FROM tracker_submissions WHERE participant_id=? AND run_id=?').bind(pid,state.run_id).first()))throw new Error('Answers or session changed while submitting. Refresh and submit again.');
 return trackerStatus(db,pid);
}
export async function trackerDashboard(db:D1Database){
 const state=await trackerState(db),key=keyOf(state);
 const {results}=await db.prepare('SELECT participant_id,nickname,score,total,answers,submitted_at FROM tracker_submissions WHERE run_id=? ORDER BY score DESC,submitted_at ASC,participant_id ASC').bind(state?.run_id??'').all<{participant_id:string;nickname:string;score:number;total:number;answers:string;submitted_at:string}>();
 return {started:!!state?.run_id,startedAt:state?.started_at??null,revealed:!!state?.revealed,
  participants:(await db.prepare('SELECT count(*) AS n FROM participants').first<{n:number}>())!.n,
  submissions:results.map((r,i)=>({...r,rank:i+1,answers:JSON.parse(r.answers) as GradedAnswer[]})),
  questions:key.map(q=>({...q,correct:results.filter(r=>(JSON.parse(r.answers) as GradedAnswer[]).find(a=>a.id===q.id)?.correct).length,
   counts:Object.fromEntries(['authentic_capture','face_swap','synthetic_generation','photo_edited'].map(s=>[s,results.filter(r=>(JSON.parse(r.answers) as GradedAnswer[]).find(a=>a.id===q.id)?.selections.includes(s as ReconsideredSelection)).length]))})),
 };
}
export async function prepareReset(db:D1Database){
 const token=crypto.randomUUID();
 await db.batch([db.prepare('DELETE FROM tracker_reset_challenges WHERE expires_at<?').bind(Date.now()),db.prepare('INSERT INTO tracker_reset_challenges VALUES(?,1,?)').bind(token,Date.now()+120000)]);
 return token;
}
export async function confirmReset(db:D1Database,token:string){
 const r=await db.prepare('UPDATE tracker_reset_challenges SET stage=2 WHERE token=? AND stage=1 AND expires_at>?').bind(token,Date.now()).run();
 if(!r.meta.changes)throw new Error('Reset confirmation expired. Start again.');
}
export async function clearTracker(db:D1Database,token:string){
 const condition='EXISTS(SELECT 1 FROM tracker_reset_challenges WHERE token=? AND stage=2 AND expires_at>?)';
 const timestamp=Date.now();
 // D1 batch is transactional. Every destructive statement repeats the guard.
 const rows=await db.batch([
  db.prepare(`DELETE FROM tracker_submissions WHERE ${condition}`).bind(token,timestamp),
  db.prepare(`DELETE FROM assessments WHERE ${condition}`).bind(token,timestamp),
  db.prepare(`DELETE FROM participants WHERE ${condition}`).bind(token,timestamp),
  db.prepare(`UPDATE tracker_state SET run_id=NULL,started_at=NULL,revealed=0,workshop_revision=NULL,answer_key=NULL WHERE id=1 AND ${condition}`).bind(token,timestamp),
  db.prepare(`DELETE FROM tracker_reset_challenges WHERE ${condition}`).bind(token,timestamp),
 ]);
 if(!rows[4].meta.changes)throw new Error('Reset confirmation expired or already used. Nothing was cleared.');
 return {participants:rows[2].meta.changes,answers:rows[1].meta.changes,submissions:rows[0].meta.changes};
}
