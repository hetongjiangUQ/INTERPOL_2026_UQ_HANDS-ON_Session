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
 const reset=route.slice(start,route.indexOf("if(method==='POST'&&path[0]==='logout')",start));
 assert(start<route.indexOf("if(path[0]!=='admin')await participantOrInstructor(request)"));
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
test('admin contains tracker and authenticated credits, without legacy mutation routes',()=>{
 const panel=readFileSync(new URL('components/admin-panel.tsx',root),'utf8');
 const route=readFileSync(new URL('app/api/[...path]/route.ts',root),'utf8');
 assert.match(panel,/<WorkshopTracker\/>/);
 assert.match(panel,/instructorAuthenticated/);
 assert.match(panel,/<AdminCredits\/>/);
 assert.match(panel,/TabsTrigger value="credits"/);
 const credits=route.slice(route.indexOf("if(method==='GET'&&path[1]==='credits')"),route.indexOf("if(path[1]==='tracker')"));
 assert.match(credits,/authenticatedAdmin\(request\)/);
 assert.match(credits,/CURRENT_MEDIA_TITLES/);
 for(const name of ['SessionConfig','ManualEditor','PortraitLab','admin/upload','admin/responses'])assert(!panel.includes(name));
 for(const name of ['upload','exercises','workshop','manuals','results','experiments','responses'])assert(!route.includes("path[1]==='"+name+"'"));
 for(const name of ['start','reveal','reset-prepare','reset-confirm','reset'])assert(route.includes("'"+name+"'"));
});
test('only current public media and watermark fixture remain',()=>{
 assert(!existsSync(new URL('public/samples/faceswap/wikimedia-face-swap-video-v1.webm',root)));
 assert.deepEqual(readdirSync(new URL('public/experiments/',root)),['watermark-888-500.png']);
 assert(!existsSync(new URL('app/credits/page.tsx',root)));
 assert(!existsSync(new URL('app/acknowledgements/page.tsx',root)));
 for(const name of ['ACKNOWLEDGEMENTS.md','THIRD_PARTY_MEDIA.md','QUIZ8_MEDIA.md'])assert(existsSync(new URL(name,root)));
});
