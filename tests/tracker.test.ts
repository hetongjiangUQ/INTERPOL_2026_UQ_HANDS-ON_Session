import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {TRACKER_KEY} from '../lib/tracker-key.server.ts';
import {buildTrackerKey,startTracker,trackerState,trackerStatus,submitTracker,trackerDashboard,prepareReset,confirmReset,clearTracker,exactMatch} from '../lib/tracker.server.ts';
import {saveAnswer} from '../lib/save-answer.server.ts';
import {submissionReady} from '../lib/submission-ready.ts';

test('final-submit gate requires all saved quizzes, active session and no unsaved edits',()=>{
 const ready={started:true,submitted:false,revealed:false,total:10,completed:Array.from({length:10},(_,i)=>String(i))};
 assert(submissionReady(ready,false));
 assert(!submissionReady(null,false));
 assert(!submissionReady(ready,true));
 for(const partial of [{started:false},{submitted:true},{revealed:true},{completed:ready.completed.slice(1)},{completed:Array(10).fill('one')}])assert(!submissionReady({...ready,...partial},false));
 const component=readFileSync(new URL('../components/workshop-tracker.tsx',import.meta.url),'utf8');
 assert.match(component,/disabled=\{!ready\|\|!confirm\|\|busy\}/);
 const training=readFileSync(new URL('../components/training.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(training,/<FinalSubmission|saveDraft|Save answer/);
 assert.match(training,/Reveal answer/);
});

test('final scoreboard does not offer CSV export',()=>{
 const component=readFileSync(new URL('../components/workshop-tracker.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(component,/Export CSV|workshop-final-results\.csv|createObjectURL/);
 assert.match(component,/Record any results you need before resetting/);
});

function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>/^\d+.*\.sql$/.test(f)).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const prepare=(query:string)=>{
  let values:any[]=[];
  return {bind(...args:any[]){values=args;return this;},async first(){return sql.prepare(query).get(...values)??null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}};}};
 };
 const db={prepare,async batch(statements:any[]){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
 sql.exec("INSERT INTO workshop_config_versions VALUES(1,'{}','2026-01-01')");
 for(const [id,key] of Object.entries(TRACKER_KEY)){
  sql.prepare('INSERT INTO media VALUES(?,?,?,1,?,?)').run(id,'test','image/jpeg',key.sha256,'2026-01-01');
  sql.prepare("INSERT INTO exercises(id,title,prompt,kind,media_id,tools,truth,explanation,published,created_at) VALUES(?,?,'test','image',?,'[]',?,'test',1,'2026-01-01')").run(id,id,id,key.selections.includes('authentic_capture')?'authentic':'manipulated');
 }
 for(const id of ['a','b','c'])sql.prepare("INSERT INTO participants VALUES(?,'2026-01-01',?,'test')").run(id,'Same nickname');
 return {db,sql};
}
async function begin(db:D1Database){const key=await buildTrackerKey(db,Object.keys(TRACKER_KEY));await startTracker(db,key,1);return (await trackerState(db))!;}
async function answerAll(db:D1Database,pid:string,wrong=false){for(const [id,key] of Object.entries(TRACKER_KEY))await saveAnswer(db,pid,id,{revision:1,verdict:wrong?'authentic':key.selections.includes('authentic_capture')?'authentic':'manipulated',selections:wrong?['authentic_capture']:key.selections},1,true);}

test('one final payload is graded atomically without per-answer writes; retries are immutable',async()=>{
 const {db,sql}=fixture();const state=await begin(db);
 const answers=Object.entries(TRACKER_KEY).map(([id,k])=>({id,revision:1,verdict:k.selections.includes('authentic_capture')?'authentic':'manipulated',selections:k.selections}));
 for(const invalid of [answers.slice(1),[answers[0],...answers.slice(0,9)],answers.map(a=>a.id==='quiz-user-image-b-v2'?{...a,verdict:'manipulated',selections:['face_swap']}:a)])
  await assert.rejects(()=>submitTracker(db,'a',state.run_id,invalid,1));
 await assert.rejects(()=>submitTracker(db,'a',state.run_id,answers,2));
 await assert.rejects(()=>submitTracker(db,'a',state.run_id,answers.map(a=>({...a,revision:99})),1));
 assert.equal(sql.prepare('SELECT count(*) n FROM tracker_submissions').get()!.n,0);
 const result=await submitTracker(db,'a',state.run_id,answers,1);
 assert(result.submitted);assert.equal(sql.prepare('SELECT count(*) n FROM assessments').get()!.n,0);
 assert.equal((await trackerDashboard(db)).submissions[0].score,10);
 assert.equal((await submitTracker(db,'a',state.run_id,[],1)).submittedAt,result.submittedAt);
 sql.exec('UPDATE tracker_state SET revealed=1');await assert.rejects(()=>submitTracker(db,'b',state.run_id,answers,1));sql.close();
});

test('key validates all ten source-bound files, no score-based grading',async()=>{
 const {db,sql}=fixture();assert.equal((await buildTrackerKey(db,Object.keys(TRACKER_KEY))).length,10);
 assert.deepEqual(TRACKER_KEY['quiz-faceswap-video-v2'].selections,['face_swap']);
 assert(exactMatch(['face_swap','synthetic_generation'],['synthetic_generation','face_swap']));
 assert(!exactMatch(['face_swap'],['synthetic_generation','face_swap']));
 await assert.rejects(()=>buildTrackerKey(db,[]));sql.exec("UPDATE media SET sha256='changed' WHERE id='quiz-first-look'");await assert.rejects(()=>buildTrackerKey(db,Object.keys(TRACKER_KEY)));sql.close();
});
test('start is idempotent; ten new answers required; hidden score, immutable submission and lock',async()=>{
 const {db,sql}=fixture();await assert.rejects(()=>submitTracker(db,'a','unknown'));
 await answerAll(db,'a');sql.exec("UPDATE assessments SET updated_at='2020-01-01'");
 const state=await begin(db);await begin(db);assert.equal((await trackerState(db))!.run_id,state.run_id);
 assert.equal((await trackerStatus(db,'a')).completed.length,0);await assert.rejects(()=>submitTracker(db,'a',state.run_id));
 await answerAll(db,'a');assert.equal((await trackerStatus(db,'a')).completed.length,10);
 const submitted=await submitTracker(db,'a',state.run_id);assert.equal(submitted.submitted,true);assert.equal(submitted.score,undefined);
 const again=await submitTracker(db,'a',state.run_id);assert.equal(again.submittedAt,submitted.submittedAt);
 assert.equal((await trackerDashboard(db)).submissions[0].score,10);
 await assert.rejects(()=>answerAll(db,'a'));sql.exec('UPDATE tracker_state SET revealed=1');assert.equal((await trackerStatus(db,'a')).score,10);
 await assert.rejects(()=>submitTracker(db,'b',state.run_id));sql.close();
});
test('rank by correctness then server submission time; duplicate nicknames stay separate',async()=>{
 const {db,sql}=fixture();const state=await begin(db);
 await answerAll(db,'a',true);await submitTracker(db,'a',state.run_id);
 for(const id of ['b','c']){await answerAll(db,id);await submitTracker(db,id,state.run_id);}
 sql.exec("UPDATE tracker_submissions SET submitted_at='2026-10-12T00:00:03.000Z' WHERE participant_id='b'; UPDATE tracker_submissions SET submitted_at='2026-10-12T00:00:02.000Z' WHERE participant_id='c'");
 const dashboard=await trackerDashboard(db);assert.deepEqual(dashboard.submissions.map(r=>r.participant_id),['c','b','a']);assert.equal(dashboard.questions[0].correct,2);assert.equal(dashboard.questions[0].counts.synthetic_generation,2);sql.close();
});
test('stale run, media, config, incomplete and concurrent changed answers cannot submit',async()=>{
 const {db,sql}=fixture();const state=await begin(db);await answerAll(db,'a');
 await assert.rejects(()=>submitTracker(db,'a','stale'));
 assert.throws(()=>sql.exec("INSERT INTO workshop_config_versions VALUES(2,'{}','today')"));
 sql.exec("UPDATE media SET sha256='changed' WHERE id='quiz-first-look'");await assert.rejects(()=>submitTracker(db,'a',state.run_id));
 sql.prepare('UPDATE media SET sha256=? WHERE id=?').run(TRACKER_KEY['quiz-first-look'].sha256,'quiz-first-look');
 const hooked={...db,prepare(query:string){if(query.startsWith('INSERT OR IGNORE INTO tracker_submissions'))sql.exec("UPDATE assessments SET reconsidered_response='{}' WHERE participant_id='a' AND exercise_id='quiz-first-look'");return db.prepare(query);}} as D1Database;
 await assert.rejects(()=>submitTracker(hooked,'a',state.run_id));assert.equal((await trackerDashboard(db)).submissions.length,0);sql.close();
});
test('reset requires two ordered confirmations, expiry and one-use token; preserves media/config',async()=>{
 const {db,sql}=fixture();const state=await begin(db);await answerAll(db,'a');await submitTracker(db,'a',state.run_id);
 const token=await prepareReset(db);await assert.rejects(()=>clearTracker(db,token));
 assert.equal((await trackerDashboard(db)).submissions.length,1);
 await confirmReset(db,token);await assert.rejects(()=>confirmReset(db,token));
 const second=await prepareReset(db);await confirmReset(db,second);
 const counts=await clearTracker(db,token);assert.equal(counts.participants,3);assert.equal(counts.answers,10);assert.equal(counts.submissions,1);
 await assert.rejects(()=>clearTracker(db,token));await assert.rejects(()=>clearTracker(db,second));
 assert.equal((await trackerState(db))!.run_id,null);assert.equal(sql.prepare('SELECT count(*) AS n FROM media').get()!.n,10);assert.equal(sql.prepare('SELECT count(*) AS n FROM exercises').get()!.n,10);assert.equal(sql.prepare('SELECT count(*) AS n FROM workshop_config_versions').get()!.n,1);
 const expired=await prepareReset(db);sql.exec('UPDATE tracker_reset_challenges SET expires_at=0');await assert.rejects(()=>confirmReset(db,expired));sql.close();
});
test('tracker routes require authenticated admin and fresh passcode for reset',()=>{
 const route=readFileSync(new URL('../app/api/[...path]/route.ts',import.meta.url),'utf8');
 const tracker=route.slice(route.indexOf("if(path[1]==='tracker')"),route.indexOf("if (method === 'GET' && path[1] === 'portrait-lab')"));
 assert.match(tracker,/authenticatedAdmin\(request\)/);assert.match(tracker,/safeEqual\(input.passcode,key\)/);assert.match(tracker,/input.acknowledged!==true/);
 assert.match(route,/if \(method !== 'GET'\) sameOrigin\(request\)/);
});
