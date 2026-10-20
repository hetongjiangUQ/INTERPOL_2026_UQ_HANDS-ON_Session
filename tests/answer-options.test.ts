import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {visibleAnswerOptions,validateAnswer} from '../lib/answer-options.ts';
import {saveAnswer} from '../lib/save-answer.server.ts';
import {readDrafts,saveDraft,clearWorkshopDrafts} from '../lib/answer-drafts.ts';
import {TRACKER_KEY} from '../lib/tracker-key.server.ts';

test('all ten quiz choices match visible subject and retain valid source answers',()=>{
 for(const [id,key] of Object.entries(TRACKER_KEY)){
  const noFace=['quiz-first-look','quiz-image-five','quiz-user-image-b-v2'].includes(id);
  assert.deepEqual(visibleAnswerOptions(id,'manipulated'),noFace?['photo_edited','synthetic_generation']:['face_swap','synthetic_generation']);
  assert.doesNotThrow(()=>validateAnswer(id,key.selections.includes('authentic_capture')?'authentic':'manipulated',key.selections));
 }
});
test('browser recovery clears only workshop draft keys',()=>{
 const values=new Map([['unrelated','keep'],['workshop-answer-drafts-v1:a:1','draft'],['workshop-answer-drafts-v1:b:1','draft']]);
 clearWorkshopDrafts({get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,removeItem:(k:string)=>{values.delete(k);}});
 assert.deepEqual([...values],[['unrelated','keep']]);
});
test('browser drafts persist, isolate participants/revisions and reject invalid entries',()=>{
 const values=new Map<string,string>();const events:string[]=[];
 const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:(e:Event)=>events.push(e.type)}});
 try{
  const draft={id:'quiz-user-image-b-v2',revision:1,verdict:'authentic' as const,selections:['authentic_capture' as const]};
  saveDraft('participant-a:1',draft);assert.deepEqual(readDrafts('participant-a:1')[draft.id],draft);
  assert.deepEqual(readDrafts('participant-b:1'),{});assert.deepEqual(readDrafts('participant-a:2'),{});
  assert.equal(events.length,1);assert.throws(()=>saveDraft('participant-a:1',{...draft,verdict:'manipulated',selections:['face_swap']}));
  values.set('workshop-answer-drafts-v1:bad','{broken');assert.deepEqual(readDrafts('bad'),{});
 }finally{
  if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else Reflect.deleteProperty(globalThis,'localStorage');
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
 }
});

test('conditional choices depend on visible subject, not authenticity',()=>{
  for(const id of ['quiz-first-look','quiz-image-five','quiz-user-image-b-v2']) {
    assert.deepEqual(visibleAnswerOptions(id,'manipulated'),['photo_edited','synthetic_generation']);
    assert.throws(()=>validateAnswer(id,'manipulated',['face_swap']));
  }
  for(const id of ['quiz-video-authentic-hard','quiz-video-synthetic-hard','quiz-faceswap-video-v2','quiz-user-image-a-v1','quiz-user-image-b-v1']) {
    assert.deepEqual(visibleAnswerOptions(id,'manipulated'),['face_swap','synthetic_generation']);
    assert.deepEqual(visibleAnswerOptions(id,'authentic'),['authentic_capture']);
    assert.doesNotThrow(()=>validateAnswer(id,'manipulated',['synthetic_generation','face_swap']));
    assert.throws(()=>validateAnswer(id,'authentic',['face_swap']));
    assert.throws(()=>validateAnswer(id,'manipulated',['authentic_capture']));
    assert.throws(()=>validateAnswer(id,'uncertain',['unsure']));
    assert.throws(()=>validateAnswer(id,'manipulated',[]));
  }
});

test('atomic answer save preserves historical answers, respects revision and reveal locks',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE assessments(participant_id TEXT,exercise_id TEXT,initial TEXT,initial_confidence INTEGER,initial_notes TEXT,reconsidered_response TEXT,updated_at TEXT,PRIMARY KEY(participant_id,exercise_id));
    CREATE TABLE exercises(id TEXT,published INTEGER,revealed INTEGER,revision INTEGER);
    CREATE TABLE workshop_config_versions(revision INTEGER);
    INSERT INTO exercises VALUES('portrait',1,0,1); INSERT INTO workshop_config_versions VALUES(4);`);
  const db={prepare(sql:string){return {bind(...args:unknown[]){return {async run(){return {meta:{changes:sqlite.prepare(sql).run(...args as any[]).changes}}}}}}}} as unknown as D1Database;
  const input={verdict:'authentic',selections:['authentic_capture'],revision:1};
  assert.equal(await saveAnswer(db,'test','portrait',input,4,true),true);
  assert.equal(await saveAnswer(db,'test','portrait',{...input,verdict:'manipulated',selections:['face_swap','synthetic_generation']},4,true),true);
  const row=sqlite.prepare('SELECT * FROM assessments').get()!;
  assert.equal(row.initial,'authentic');assert.equal(row.initial_confidence,null);
  assert.deepEqual(JSON.parse(row.reconsidered_response as string).selections,['synthetic_generation','face_swap']);
  assert.equal(await saveAnswer(db,'test','portrait',input,4,false),false);
  assert.equal(await saveAnswer(db,'test','portrait',input,3,true),false);
  assert.equal(await saveAnswer(db,'test','portrait',{...input,revision:2},4,true),false);
  sqlite.exec('UPDATE exercises SET revealed=1');
  assert.equal(await saveAnswer(db,'test','portrait',input,4,true),false);
  sqlite.close();
});
