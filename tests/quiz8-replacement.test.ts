import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {controlledVideo,ensureControlledVideo,controlledVideoResults} from '../lib/controlled-video.server.ts';
import {replaceRetiredQuiz8,QUIZ8_TOOLS} from '../lib/quiz8-replacement.ts';
import {DEFAULT_WORKSHOP,practiceDefaults} from '../lib/workshop-config.ts';

test('accepted clip has its own exact byte binding and six actual exact-file results without overwriting historic results',async()=>{
  const bytes=readFileSync(new URL('../public'+controlledVideo.url,import.meta.url));
  assert.equal(bytes.length,controlledVideo.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),controlledVideo.sha256);
  const statements:Array<{sql:string;args:unknown[]}>=[];
  const db={prepare(sql:string){return {bind(...args:unknown[]){const statement={sql,args};statements.push(statement);return statement;}};},async batch(){}};
  await ensureControlledVideo(db as unknown as D1Database);
  assert.equal(statements.length,9);
  assert.equal(statements.filter(s=>s.sql.startsWith('UPDATE')).length,1);
  const inserts=statements.filter(s=>s.sql.includes('detector_results'));
  assert.equal(inserts.length,6);
  assert.ok(inserts.every(s=>s.sql.startsWith('INSERT OR IGNORE') && s.args[4]===controlledVideo.sha256));
  for(const result of controlledVideoResults()){
    assert.equal(result.samples?.length,8);
    assert.ok(Math.abs(result.score! - result.samples!.reduce((sum,s)=>sum+s.score,0)/8)<1e-9);
  }
  assert.ok(statements[1].args.includes(controlledVideo.id));
  assert.ok(statements[0].args.includes(controlledVideo.sha256));
});
test('replacement preserves order and settings without mutating historic configuration',()=>{
  const original={...structuredClone(DEFAULT_WORKSHOP),practices:[practiceDefaults('quiz-first-look'),{...practiceDefaults('quiz-faceswap-video-v1'),enabled:false},practiceDefaults('quiz-user-image-a-v1')]};
  const saved=structuredClone(original);
  const result=replaceRetiredQuiz8(original);
  assert.deepEqual(original,saved);
  assert.deepEqual(result.practices.map(p=>p.id),['quiz-first-look',controlledVideo.id,'quiz-user-image-a-v1']);
  assert.equal(result.practices[1].enabled,false);
  assert.deepEqual(result.practices[1].tools,[...QUIZ8_TOOLS]);
  assert.deepEqual(replaceRetiredQuiz8(result),result);
  const both={...result,practices:[...result.practices,practiceDefaults('quiz-faceswap-video-v1')]};
  assert.equal(replaceRetiredQuiz8(both).practices.length,3);
});
