import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {test} from 'node:test';
import {inspectionFrameTime} from '../lib/video-inspection-frame.ts';
import {createHash} from 'node:crypto';
import {AUTHENTIC_REFERENCES} from '../lib/authentic-references.ts';
test('authentic references reuse manual tools but cannot load detector evidence or enter quizzes',()=>{
 assert.equal(AUTHENTIC_REFERENCES.length,2);
 for(const {exercise} of AUTHENTIC_REFERENCES){
  assert.equal(exercise.kind,'image');assert.deepEqual(exercise.tools,[]);
  assert.equal(exercise.published,false);
  const bytes=readFileSync(new URL('../public'+exercise.mediaUrl,import.meta.url));
  assert.equal(bytes.length,exercise.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),exercise.sha256);
 }
 const inspector=readFileSync(new URL('../components/media-inspector.tsx',import.meta.url),'utf8');
 assert.match(inspector,/const detectors = referenceOnly \? \[\]/);
 assert.match(inspector,/const sequenceMethods = referenceOnly \? \[\]/);
 assert.match(inspector,/if \(referenceOnly\) return;/);
 const reference=readFileSync(new URL('../components/authentic-references.tsx',import.meta.url),'utf8');
 assert.match(reference,/<MediaInspector[^>]*unlocked referenceOnly/);
 assert.doesNotMatch(reference,/Save answer|FinalSubmission|saveDraft|api\(/);
 const training=readFileSync(new URL('../components/training.tsx',import.meta.url),'utf8');
 assert.match(training,/<AuthenticReferences \/>/);
 assert.match(training,/comparisonReference=\{<AuthenticReferences \/>\}/);
 assert.doesNotMatch(training,/training-with-references/);
 assert.match(inspector,/className="comparison-media">\{mediaContent\}<\/div>\s*<section className="comparison-tools" aria-label="Quiz inspection aids"/);
 assert.match(inspector,/aria-label="Reference inspection aids"/);
 assert.match(inspector,/aria-label="Quiz detector evidence">\{detectorContent\}/);
 const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.match(css,/grid-template-rows: subgrid/);
 assert.doesNotMatch(training,/setExercises\([^;]*AUTHENTIC_REFERENCES/);
});
test('quiz aids separate edges and high-pass without colour/bit-plane controls',()=>{
 const inspector=readFileSync(new URL('../components/media-inspector.tsx',import.meta.url),'utf8');
 assert.match(inspector,/IMAGE_INSPECTION_TOOLS: ToolId\[\] = \['texture', 'highpass', 'compression', 'ela'\]/);
 const visual=readFileSync(new URL('../components/visual-inspector.tsx',import.meta.url),'utf8');
 assert.match(visual,/tool==='highpass'\?'detail':'edges'/);
 assert.match(visual,/!simple&&tool==='layers'&&<fieldset>/);
});
test('video inspection uses midpoint, with Quiz 3 in the final second',()=>{
 assert.equal(inspectionFrameTime('quiz-video-authentic-hard',10),5);
 assert.equal(inspectionFrameTime('quiz-faceswap-video-v2',20),10);
 assert.equal(inspectionFrameTime('quiz-video-synthetic-hard',10),9.5);
 assert.equal(inspectionFrameTime('quiz-video-synthetic-hard',0.2),0);
 for(const value of [NaN,Infinity,0,-1]) assert.throws(()=>inspectionFrameTime('any',value));
 const inspector=readFileSync(new URL('../components/media-inspector.tsx',import.meta.url),'utf8');
 assert.match(inspector,/image\.src = inspectionUrl/);
 assert.match(inspector,/mediaUrl=\{inspectionUrl!\}/);
 assert.match(inspector,/aria-label="Video timing controls"/);
});
const root=new URL('../',import.meta.url);
test('watermark result omits duplicate source preview and always offers exact PNG download',()=>{
 const source=readFileSync(new URL('components/watermark-lab.tsx',root),'utf8');
 assert.doesNotMatch(source,/Working image before embedding|Working image before watermarking/);
 assert.match(source,/Download watermark embedded image/);
 assert.doesNotMatch(source,/options\.download&&/);
 assert.match(source,/saveBlob\(new Blob\(\[new Uint8Array\(result.png\)\]/);
});
test('lab navigation uses browser links rather than failing client router',()=>{
 const header=readFileSync(new URL('components/header.tsx',root),'utf8');
 assert.doesNotMatch(header,/next\/link|<Link/);
 assert.match(header,/<a href="\/steganography"/);
 assert.match(header,/<a href="\/hands-on" className="lab-nav-button"/);
});
test('browser reset expires cookies without authentication or server data deletion',()=>{
 const route=readFileSync(new URL('app/api/[...path]/route.ts',root),'utf8');
 const start=route.indexOf("if(method==='POST'&&path[0]==='reset-browser-session')");
 const reset=route.slice(start,route.indexOf("if(['admin','local-login','logout'].includes(path[0]))",start));
 assert(start<route.indexOf('await participant(request)'));
 assert.match(reset,/lab_participant','',0/);assert.match(reset,/lab_admin','',0/);
 assert.doesNotMatch(reset,/DELETE|db\(\)/);
 assert.match(route,/if \(method !== 'GET'\) sameOrigin\(request\)/);
});
test('review header offers a one-step sign out without the old reset panel',()=>{
 const header=readFileSync(new URL('components/header.tsx',root),'utf8');
 const signOut=readFileSync(new URL('components/sign-out.tsx',root),'utf8');
 assert.match(header,/<SignOut\/>/);
 assert.doesNotMatch(header,/ResetBrowserSession/);
 assert.match(signOut, /'Sign out'/);
 assert.match(signOut,/post\('reset-browser-session',\{\}\)/);
 assert.match(signOut,/clearWorkshopDrafts\(localStorage\)/);
 assert.doesNotMatch(signOut,/setConfirm|unsent answers|Reset this browser session/);
});
test('review site has no admin page or admin mutation endpoints',()=>{
 const route=readFileSync(new URL('app/api/[...path]/route.ts',root),'utf8');
 assert(!existsSync(new URL('app/admin/page.tsx',root)));
 assert(!existsSync(new URL('components/admin-panel.tsx',root)));
 assert(!existsSync(new URL('components/workshop-tracker.tsx',root)));
 assert.match(route,/\['admin','local-login','logout'\]\.includes\(path\[0\]\)/);
 assert.match(route,/path\[0\]==='review'/);
 assert.match(route,/path\[1\]==='scoreboard'/);
 assert.match(route,/path\[1\]==='references'/);
 assert.match(route,/admin:false,instructorAuthenticated:false/);
 assert.match(route,/await participant\(request\)/);
 assert.doesNotMatch(route,/authenticatedAdmin\(|participantOrInstructor\(/);
 assert.doesNotMatch(route,/path\[0\]==='admin'|path\[1\]==='reset-prepare'|path\[1\]==='reset-confirm'|path\[2\]==='start'|path\[2\]==='reveal'/);
 const gate=readFileSync(new URL('components/participant-access-gate.tsx',root),'utf8');
 assert.match(gate,/session\.participant \? 'admitted' : 'required'/);
 assert.doesNotMatch(gate,/session\.instructorAuthenticated/);
});
test('only current public media and watermark fixture remain',()=>{
 assert(!existsSync(new URL('public/samples/faceswap/wikimedia-face-swap-video-v1.webm',root)));
 assert.deepEqual(readdirSync(new URL('public/experiments/',root)),['watermark-888-500.png']);
 assert(!existsSync(new URL('app/credits/page.tsx',root)));
 assert(!existsSync(new URL('app/acknowledgements/page.tsx',root)));
 assert(existsSync(new URL('THIRD_PARTY_MEDIA.md',root)));
 for(const name of ['ACKNOWLEDGEMENTS.md','QUIZ8_MEDIA.md','components/ui/checkbox.tsx'])assert(!existsSync(new URL(name,root)));
});
