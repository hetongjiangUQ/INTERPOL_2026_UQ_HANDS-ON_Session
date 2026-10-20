import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeMessage,decodeMessage,crc32} from '../lib/steganography.ts';
import {validateResult,confidence,verdict,formatModelScore,reconsideredResponse,parseReconsideredResponse} from '../lib/domain.ts';
import {readFileSync} from 'node:fs';
test('UTF-8 messages round-trip without changing visible cover text',()=>{for(const message of ['Hello','你好 👮 café','\nCase 12\tA','a'.repeat(512)]){const e=encodeMessage('📌 Training begins at nine.',message);assert.equal(decodeMessage(e.stego).message,message);assert.equal(decodeMessage(e.stego).carrier,'📌 Training begins at nine.');assert.equal(e.hiddenCharacters,(new TextEncoder().encode(message).length+8)*8);}});
test('steganography rejects damaged, stripped, oversized and ambiguous payloads',()=>{const e=encodeMessage('Cover text.','Secret');assert.throws(()=>decodeMessage('Cover text.'));assert.throws(()=>decodeMessage(e.stego.replace('\u200b','')));const chars=Array.from(e.stego);let count=0;for(let i=0;i<chars.length;i++)if(chars[i]==='\u200b'||chars[i]==='\u200c'){if(count++===40){chars[i]=chars[i]==='\u200b'?'\u200c':'\u200b';break;}}assert.throws(()=>decodeMessage(chars.join('')),/Checksum/);assert.throws(()=>encodeMessage('Cover','👮'.repeat(129)));assert.throws(()=>encodeMessage('A\u200bB','Text'));assert.throws(()=>encodeMessage('','Text'));});
test('CRC-32 uses the standard check value',()=>assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926));
const hash='a'.repeat(64);const result={schemaVersion:1,model:'univfd',modelVersion:'verified test fixture',mediaSha256:hash,preprocessing:'test preprocessing',createdAt:'2026-09-09T00:00:00Z',score:.5,scoreType:'synthetic_sigmoid',note:'Unit test fixture, never published.'};
test('single-image exports may represent absent frame samples as null',()=>{assert.equal(validateResult({...result,samples:null},hash).samples,undefined);});
test('result import rejects mismatched media and misleading score formats',()=>{assert.equal(validateResult(result,hash).score,.5);assert.throws(()=>validateResult(result,'b'.repeat(64)));assert.throws(()=>validateResult({...result,score:2},hash));assert.throws(()=>validateResult({...result,model:'aasist'},hash));assert.throws(()=>validateResult({...result,score:NaN},hash));assert.throws(()=>validateResult({...result,samples:[{timeSeconds:-1,score:0}]},hash));assert.throws(()=>confidence(101));assert.throws(()=>verdict('real'));});
test('FatFormer retains its distinct softmax score label',()=>{assert.equal(validateResult({...result,model:'fatformer',scoreType:'synthetic_softmax'},hash).scoreType,'synthetic_softmax');assert.throws(()=>validateResult({...result,model:'fatformer'},hash));});
test('model-score formatting preserves very small nonzero outputs',()=>{
  assert.equal(formatModelScore(0),'0.000');
  assert.equal(formatModelScore(0.954665),'0.955');
  assert.equal(formatModelScore(0.000108),'0.000108');
  assert.equal(formatModelScore(1.285e-8),'1.28e-8');
});
test('post-inspection classifications are compositional, canonical and safely parsed',()=>{
  assert.deepEqual(reconsideredResponse({schemaVersion:1,selections:['face_swap','synthetic_generation']}),{schemaVersion:1,selections:['synthetic_generation','face_swap']});
  assert.deepEqual(reconsideredResponse({schemaVersion:1,selections:['authentic_capture','face_swap']}),{schemaVersion:1,selections:['authentic_capture','face_swap']});
  assert.deepEqual(reconsideredResponse({schemaVersion:1,selections:['unsure']}),{schemaVersion:1,selections:['unsure']});
  assert.throws(()=>reconsideredResponse({schemaVersion:1,selections:[]}));
  assert.throws(()=>reconsideredResponse({schemaVersion:1,selections:['face_swap','face_swap']}));
  assert.throws(()=>reconsideredResponse({schemaVersion:1,selections:['unsure','face_swap']}));
  assert.throws(()=>reconsideredResponse({schemaVersion:1,selections:['other']}));
  assert.equal(parseReconsideredResponse('{"schemaVersion":2,"selections":["face_swap"]}'),null);
  assert.equal(parseReconsideredResponse('not json'),null);
});
