import {saveAnswer} from '@/lib/save-answer.server';
import {DETECTORS,CURRENT_MEDIA_TITLES} from '@/lib/acknowledgements';
import mediaCredits from '@/lib/sample-credits.json';
import {reviewAnswer,publicScoreboard} from '@/lib/review.server';
import {trackerState,trackerStatus,trackerDashboard} from '@/lib/tracker.server';
import {portraitMedia,portraitQuizCase,portraitQuizEvidence} from '@/lib/portrait-lab.server';
import {ensureExamples,bundledUrl} from '@/lib/examples.server';
import {ensureQuizBank} from '@/lib/quiz-bank.server';
import {quizCandidate} from '@/lib/quiz-bank';
import {readWorkshop} from '@/lib/workshop-config.server';
import {INSPECTION_REQUIRES_FIRST_ANSWER,participantExercise,practiceConfig,participantDetectorAccess,isSessionDetector} from '@/lib/workshop-config';
import {videoSequenceEvidence} from '@/lib/video-sequence-evidence.server';
import {parseReconsideredResponse,validateResult} from '@/lib/domain';
import {bindings,db,HttpError,json,body,sameOrigin,participant,participantSession,participantPasscode,participantAccessTag,exercise,publicExercise,setCookie,safeEqual,externalUrl} from '@/lib/server';
export const dynamic='force-dynamic';
const now=()=>new Date().toISOString();
let prepared:Promise<void>|null=null;
function prepareExamples(){return prepared??=(async()=>{await ensureExamples(db());await ensureQuizBank(db());})().catch(error=>{prepared=null;throw error;});}
async function handler(request:Request){
  try{
    const path=new URL(request.url).pathname.slice(5).split('/');const method=request.method;
    if (method !== 'GET') sameOrigin(request);
    if(method==='GET'&&path[0]==='health'){
      try{
        await Promise.all([
          db().prepare('SELECT COUNT(*) AS count FROM participants').first(),
          bindings().FILES.head('__healthcheck__'),
        ]);
        return json({ok:true});
      }catch{
        return json({ok:false},503);
      }
    }
    if(method==='GET'&&path[0]==='session'){
      const current=await participantSession(request);
      return json({admin:false,instructorAuthenticated:false,participant:!!current,nickname:current?.nickname??null,openAccess:false,localLogin:false});
    }
    if(method==='POST'&&path[0]==='join'){
      const current=await participantSession(request);if(current)return json({ok:true,nickname:current.nickname});
      const raw=await body(request,2000);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new HttpError(400,'Passcode is required.');
      const input=raw as Record<string,unknown>;
      if(typeof input.passcode!=='string'||!await safeEqual(input.passcode,participantPasscode()))throw new HttpError(403,'Incorrect workshop passcode.');
      const id=crypto.randomUUID(),nickname=`Visitor ${id.slice(0,8)}`,accessTag=await participantAccessTag();
      await db().prepare('INSERT INTO participants(id,nickname,access_tag,created_at) VALUES (?,?,?,?)').bind(id,nickname,accessTag,now()).run();
      return json({ok:true,nickname},200,{'Set-Cookie':setCookie(request,'lab_participant',id,604800)});
    }
    if(method==='POST'&&path[0]==='reset-browser-session'){
      // Works with expired/deleted participant sessions; no database mutation.
      const response=json({ok:true});
      response.headers.append('Set-Cookie',setCookie(request,'lab_participant','',0));
      response.headers.append('Set-Cookie',setCookie(request,'lab_admin','',0));
      return response;
    }
    if(['admin','local-login','logout'].includes(path[0]))throw new HttpError(404,'Endpoint not found.');
    await participant(request);
    if(method==='GET'&&path[0]==='slides'&&path[1]==='download'&&path.length===2){
      const object=await bindings().FILES.get('workshop-slides/UQ_Deepfake_Slide.pptx');
      if(!object)throw new HttpError(404,'Slides unavailable.');
      return new Response(object.body,{headers:{
        'Content-Type':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition':'attachment; filename="UQ_Deepfake_Slide.pptx"',
        'Content-Length':String(object.size),
        'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff',
      }});
    }
    if(method==='POST'&&(path[0]==='assessment'||(path[0]==='tracker'&&path[1]==='submit')))
      throw new HttpError(403,'This review website does not accept quiz submissions.');
    if(method==='GET'&&path[0]==='review'){
      if(path[1]==='references')return json({detectors:DETECTORS,media:mediaCredits.filter(item=>CURRENT_MEDIA_TITLES.has(item.title))});
      if(path[1]==='scoreboard')return json(publicScoreboard(await trackerDashboard(db())));
      if(path[1]==='answer'){
        const row=await exercise(path[2]);
        const config=(await readWorkshop(db())).config;
        if(!row.published||!practiceConfig(config,path[2]).enabled)throw new HttpError(404,'Exercise unavailable.');
        const answer=reviewAnswer(path[2],String(row.sha256));
        if(!answer)throw new HttpError(409,'No verified answer is available for this media version.');
        return json(answer);
      }
      throw new HttpError(404,'Review endpoint not found.');
    }
    if(path[0]==='tracker'){
      const pid=await participant(request);
      if(method==='GET')return json(await trackerStatus(db(),pid));
      throw new HttpError(404,'Tracker endpoint not found.');
    }
    if(method==='GET'&&path[0]==='workshop'){
      const snapshot=await readWorkshop(db());
      return json({...snapshot,config:{...snapshot.config,practices:snapshot.config.practices.filter(p=>p.enabled)}});
    }
    if(method==='GET'&&path[0]==='exercises'){await prepareExamples();
      const snapshot=await readWorkshop(db());
      const {results}=await db().prepare('SELECT e.*,m.mime,m.bytes,m.sha256 FROM exercises e LEFT JOIN media m ON e.media_id=m.id WHERE e.published=1 ORDER BY e.created_at,e.id').all();
      const items=results.map(r=>participantExercise(publicExercise(r),snapshot.config)).filter(e=>e!==null);
      items.sort((a,b)=>snapshot.config.practices.findIndex(p=>p.id===a.id)-snapshot.config.practices.findIndex(p=>p.id===b.id));
      return json({exercises:items,workshopRevision:snapshot.revision});
    }
    if(method==='GET'&&path[0]==='media'){
      const id=path[1];const record=await db().prepare('SELECT * FROM media WHERE id=?').bind(id).first();if(!record)throw new HttpError(404,'Media not found.');
      const config=(await readWorkshop(db())).config;
      const associated=await db().prepare('SELECT id FROM exercises WHERE media_id=? AND published=1').bind(id).all<{id:string}>();
      if(!associated.results.some(e=>practiceConfig(config,e.id).enabled))throw new HttpError(404,'Media not found.');
      if(String(record.object_key).startsWith('portrait:')){
        const response=await portraitMedia(String(record.object_key).slice('portrait:'.length));
        if(response&&response.headers.get('content-length')===String(record.bytes))return response;
        throw new HttpError(404,'Media object unavailable.');
      }
      const bundled=bundledUrl(id);if(bundled&&record.object_key==='bundled:'+bundled)return Response.redirect(externalUrl(bundled,request),302);
      const range=request.headers.get('range');if(range&&!/^bytes=\d+-\d*$/.test(range))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${record.bytes}`}});
      const start=range?Number(range.split('=')[1].split('-')[0]):0;const end=range?.split('-')[1]?Number(range.split('-')[1]):Number(record.bytes)-1;
      if(range&&(start> end||start>=Number(record.bytes)))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${record.bytes}`}});
      const object=await bindings().FILES.get(String(record.object_key),range?{range:{offset:start,length:Math.min(end,Number(record.bytes)-1)-start+1}}:{});if(!object)throw new HttpError(404,'Media object unavailable.');
      const headers:Record<string,string>={'Content-Type':String(record.mime),'Cache-Control':'private, max-age=300','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="exercise-media"','Content-Length':String(range?Math.min(end,Number(record.bytes)-1)-start+1:record.bytes)};
      if(range)headers['Content-Range']=`bytes ${start}-${Math.min(end,Number(record.bytes)-1)}/${record.bytes}`;
      return new Response(object.body,{status:range?206:200,headers});
    }
    if(method==='GET'&&path[0]==='portrait-evidence'){
      const exerciseId=path[1],caseId=portraitQuizCase(exerciseId),evidence=portraitQuizEvidence(exerciseId);
      if(!caseId||!evidence)throw new HttpError(404,'Portrait evidence unavailable.');
      const row=await exercise(exerciseId);
      if(!row.published||String(row.sha256)!==evidence.mediaSha256)throw new HttpError(404,'Portrait evidence unavailable.');
      const snapshot=await readWorkshop(db()),view=participantExercise(publicExercise(row),snapshot.config);
      if(!view||!quizCandidate(exerciseId)?.portrait)throw new HttpError(404,'Portrait evidence unavailable.');
      if(INSPECTION_REQUIRES_FIRST_ANSWER&&view.practice.mode==='judgement'){
        const pid=await participant(request);
        if(!await db().prepare('SELECT initial FROM assessments WHERE participant_id=? AND exercise_id=?').bind(pid,exerciseId).first())throw new HttpError(403,'Save your first judgement to see the portrait evidence.');
      }
      if(path.length===2)return json(evidence);
      throw new HttpError(404,'Portrait evidence unavailable.');
    }
    if(method==='GET'&&path[0]==='video-sequence-evidence'){
      if(path.length!==2)throw new HttpError(404,'Video-sequence evidence unavailable.');
      const exerciseId=path[1],evidence=videoSequenceEvidence(exerciseId);
      if(!evidence)throw new HttpError(404,'Video-sequence evidence unavailable.');
      const row=await exercise(exerciseId);
      if(String(row.kind)!=='video'||String(row.sha256)!==evidence.mediaSha256)throw new HttpError(404,'Video-sequence evidence unavailable.');
      const snapshot=await readWorkshop(db()),view=participantExercise(publicExercise(row),snapshot.config);
      if(!row.published||!view)throw new HttpError(404,'Video-sequence evidence unavailable.');
      if(INSPECTION_REQUIRES_FIRST_ANSWER&&view.practice.mode==='judgement'){
        const pid=await participant(request);
        if(!await db().prepare('SELECT initial FROM assessments WHERE participant_id=? AND exercise_id=?').bind(pid,exerciseId).first())throw new HttpError(403,'Save your first judgement to see the video-sequence evidence.');
      }
      return json(evidence);
    }
    if(path[0]==='assessment'){
      const pid=await participant(request);const row=await exercise(path[1]);if(!row.published)throw new HttpError(404,'Exercise unavailable.');
      const snapshot=await readWorkshop(db()),settings=practiceConfig(snapshot.config,path[1]);
      if(!settings.enabled)throw new HttpError(404,'Practice is not included in this session.');
      if(method==='GET'){
        const a=await db().prepare('SELECT * FROM assessments WHERE participant_id=? AND exercise_id=?').bind(pid,path[1]).first();
        return json({assessment:a?{initial:a.initial,initialConfidence:a.initial_confidence,initialNotes:a.initial_notes,revised:a.revised,revisedConfidence:a.revised_confidence,revisedNotes:a.revised_notes,reconsideredResponse:parseReconsideredResponse(a.reconsidered_response)}:null});
      }
      if(method==='POST'){
        if((await trackerState(db()))?.revealed||await db().prepare('SELECT 1 FROM tracker_submissions WHERE participant_id=?').bind(pid).first())throw new HttpError(409,'Your final submission is locked or results have been revealed.');
        if(row.placeholder||settings.mode==='explore')throw new HttpError(403,'Guided practices do not collect authenticity judgements.');
        if(row.revealed)throw new HttpError(409,'The answer has been revealed. Assessments are now locked.');
        const input=await body(request);
        if(input.workshopRevision!==snapshot.revision)throw new HttpError(409,'Session settings changed. Refresh before submitting.');
        if(input.stage==='answer'){
          if(!await saveAnswer(db(),pid,path[1],input,snapshot.revision,settings.allowRevision))throw new HttpError(409,'This answer is locked or the session changed. Refresh before saving.');
          return json({ok:true});
        }
        throw new HttpError(400,'Invalid answer stage.');
      }
    }
    if(method==='GET'&&path[0]==='result'){
      if(!isSessionDetector(path[2]))throw new HttpError(404,'Detector unavailable for this practice.');
      const row=await exercise(path[1]);
      const snapshot=await readWorkshop(db());
      const access=participantDetectorAccess(publicExercise(row),snapshot.config,path[2],false);
      if(access===404)throw new HttpError(404,'Detector unavailable for this practice.');
      if(access===403){
        const pid=await participant(request);
        if(!await db().prepare('SELECT initial FROM assessments WHERE participant_id=? AND exercise_id=?').bind(pid,path[1]).first())throw new HttpError(403,'Save your first judgement to see the detector result.');
      }
      const result=await db().prepare('SELECT result FROM detector_results WHERE exercise_id=? AND model=?').bind(path[1],path[2]).first();let valid=null;if(result){try{valid=validateResult(JSON.parse(String(result.result)),String(row.sha256));}catch{valid=null;}}if(valid&&('model' in valid)&&valid.model!==path[2])valid=null;return json({result:valid});
    }
    throw new HttpError(404,'Endpoint not found.');
  }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof Error&& !/D1|SQLITE|binding|Cannot read/.test(e.message))return json({error:e.message},400);console.error('API request failed',e);return json({error:'The service is unavailable. Please retry or contact the instructor.'},503);}
}
export const GET=handler;
export const POST=handler;
