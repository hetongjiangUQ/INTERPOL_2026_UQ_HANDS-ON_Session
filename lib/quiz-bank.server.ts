import {QUIZ_BANK,type QuizQuestion} from './quiz-bank';
import {ensureControlledVideo} from './controlled-video.server';
import samples from './examples-data.server.json';
import warmupResults from './warmup-detectors.server.json';
import videos from './video-cases.server.json';
import {validateResult,type DetectorResult} from './domain';
import {portraitQuizCase,portraitQuizCasesData} from './portrait-lab.server';
import {controlledFaceSwapStillCase,controlledFaceSwapStillData} from './controlled-face-swap-still.server';
import {userImageCase,userImageCasesData} from './user-image-cases.server';

const questions:Record<string,{public:QuizQuestion;answer:string;explanation:string}>={};
const portraitMediaIds={'hard-authentic':'portrait-case-d','hard-synthetic':'portrait-case-e'} as const;
export const quizQuestion=(id:string)=>questions[id]?.public;
export function checkQuizAnswer(id:string,choice:unknown){
  const q=questions[id];if(!q||typeof choice!=='string'||!q.public.options.some(o=>o.id===choice))throw new Error('Choose one of the available answers.');
  return {correct:choice===q.answer,answer:q.answer,explanation:q.explanation};
}

/** Adds separate quiz records; existing exercises, responses and instructor edits are untouched. */
export async function ensureQuizBank(db:D1Database){
  await ensureControlledVideo(db);
  const existing=await db.prepare("SELECT id FROM exercises WHERE id LIKE 'quiz-%'").all<{id:string}>();
  const now=new Date().toISOString();const statements:D1PreparedStatement[]=[];
  const portraits=portraitQuizCasesData();
  const controlledFaceSwap=controlledFaceSwapStillData().case;
  const userImages=userImageCasesData().cases.filter(item=>item.id==='quiz-user-image-a-v1'||item.id==='quiz-user-image-b-v2');
  for(const v of videos)statements.push(db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)').bind(v.mediaId,'bundled:'+v.url,v.mime,v.bytes,v.sha256,now));
  statements.push(db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)').bind(controlledFaceSwap.mediaId,'bundled:'+controlledFaceSwap.url,controlledFaceSwap.mime,controlledFaceSwap.bytes,controlledFaceSwap.sha256,now));
  for(const item of userImages)statements.push(db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)').bind(item.mediaId,'bundled:'+item.url,item.mime,item.bytes,item.sha256,now));
  for(const c of portraits)statements.push(db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)').bind(portraitMediaIds[c.id as keyof typeof portraitMediaIds],'portrait:'+c.id,'image/jpeg',c.bytes,c.sha256,now));
  for(const q of QUIZ_BANK.filter(q=>q.id!=='quiz-faceswap-video-v1'&&!existing.results.some(e=>e.id===q.id))){
    const sampleId=q.id==='quiz-first-look'?'source-example-01':q.id==='quiz-image-five'?'source-example-02':null;
    const sample=samples.find(e=>e.id===sampleId);
    const video=videos.find(v=>v.id===q.id);
    const packagedCase=controlledFaceSwapStillCase(q.id)??userImageCase(q.id);
    const portraitId=portraitQuizCase(q.id),portrait=portraitId?portraits.find(c=>c.id===portraitId):null;
    const portraitMedia=portrait?{mediaId:portraitMediaIds[portrait.id as keyof typeof portraitMediaIds],mime:'image/jpeg',bytes:portrait.bytes,sha256:portrait.sha256}:null;
    const media=packagedCase??video??sample??portraitMedia;
    const question=quizQuestion(q.id);
    const portraitPrompt=`Inspect the portrait before opening any automated result. Record whether it appears authentic, AI-generated or manipulated, or uncertain, with your confidence. After saving, reveal the six classifier outputs${portrait?.maps?.length?' and two localisation maps':''}. Which results agree or conflict, and what evidence would you seek before acting?`;
    const prompt=packagedCase?.prompt??(portrait?portraitPrompt:sample?.prompt??q.description);
    const portraitExplanation=portrait?.id==='hard-authentic'
          ?'Documented source label: authentic photograph. This is the unchanged JPEG for coded adult participant 025 from Lisa DeBruine and Benedict Jones\'s Face Research Lab London Set, version 5, CC BY 4.0. The authors report signed adult consent for research and presentations. In the paired stress case, UniversalFakeDetect, SPAI and AIDE rank this authentic file as more synthetic-looking than the source-labelled generated file; AIDE remains low on both. Community Forensics and FatFormer order the pair conventionally but stay low, while GenD addresses the different task of face manipulation. The pair was purpose-selected after screening 102 authentic and 75 source-labelled synthetic portraits, so it is not a random sample, benchmark or accuracy estimate. The source label rests on publisher documentation; no camera RAW, independent witness record or signed capture credential was obtained.'
        :portrait?.id==='hard-synthetic'
          ?'Documented source label: fully synthetic text-to-image portrait, not a face swap. This is unchanged SFHQ-T2I FLUX1.dev sample 0000336, described by the publisher as a fictional adult and released under a publisher-declared MIT licence. In the paired stress case, UniversalFakeDetect scores the authentic/synthetic files 0.677698/0.000031, SPAI 0.603842/0.016141 and AIDE 0.127496/0.054461. Community Forensics and FatFormer instead rank the synthetic file higher but keep both outputs low. GenD is shown separately because it targets face manipulation. This pair was deliberately selected after detector-output inspection; it does not estimate general detector accuracy. The source label is publisher-documented rather than C2PA-verified, and generation was not independently replayed.'
        :'';
    const explanation=packagedCase?.explanation??(portrait?portraitExplanation:question?questions[q.id].explanation:sample?.explanation??'');
    statements.push(db.prepare('INSERT OR IGNORE INTO exercises(id,title,prompt,kind,media_id,tools,truth,explanation,published,revealed,placeholder,revision,created_at) VALUES (?,?,?,?,?,?,?,?,1,0,?,1,?)').bind(q.id,q.title,video?.prompt??prompt,packagedCase?.kind??(q.video?'video':'image'),media?.mediaId??null,JSON.stringify(q.tools),packagedCase?.truth??(portrait?(['authentic','hard-authentic'].includes(portrait.id)?'authentic':'manipulated'):video?.truth??sample?.truth??'uncertain'),video?.explanation??explanation,(packagedCase||video||sample||portrait)?0:1,now));
    if(packagedCase)for(const r of packagedCase.results){const validated=validateResult(r,packagedCase.sha256);statements.push(db.prepare('INSERT OR IGNORE INTO detector_results(exercise_id,model,result) VALUES (?,?,?)').bind(q.id,validated.model,JSON.stringify(validated)));}
    if(video)for(const r of video.results){const validated=validateResult(r,video.sha256);statements.push(db.prepare('INSERT OR IGNORE INTO detector_results(exercise_id,model,result) VALUES (?,?,?)').bind(q.id,validated.model,JSON.stringify(validated)));}
    if(q.id==='quiz-image-five'&&sample){
      for(const r of sample.results as DetectorResult[]){const validated=validateResult(r,sample.sha256);statements.push(db.prepare('INSERT OR IGNORE INTO detector_results(exercise_id,model,result) VALUES (?,?,?)').bind(q.id,validated.model,JSON.stringify(validated)));}
    }
  }
  for(const r of warmupResults){
    const validated=validateResult(r,samples.find(s=>s.id==='source-example-01')!.sha256);
    statements.push(db.prepare('INSERT OR IGNORE INTO detector_results(exercise_id,model,result) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM exercises e JOIN media m ON m.id=e.media_id WHERE e.id=? AND m.sha256=?)').bind('quiz-first-look',validated.model,JSON.stringify(validated),'quiz-first-look',validated.mediaSha256));
  }
  if(statements.length)await db.batch(statements);
}
