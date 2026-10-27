'use client';
import {useCallback,useEffect,useState} from 'react';
import {api,post} from '@/lib/client';
import {submissionReady} from '@/lib/submission-ready';
import {RECONSIDERED_LABELS,type ReconsideredSelection} from '@/lib/domain';
import {readDrafts} from '@/lib/answer-drafts';
import type {trackerStatus,trackerDashboard} from '@/lib/tracker.server';
export type ParticipantTracker=Awaited<ReturnType<typeof trackerStatus>>;
type Dashboard=Awaited<ReturnType<typeof trackerDashboard>>&{keyError?:string};
const classifications=(values:ReconsideredSelection[])=>values.map(v=>RECONSIDERED_LABELS[v]).join(' + ');
const time=(value:string)=>new Date(value).toLocaleString();

export function FinalSubmission({onChange,dirty,exercises,workshopRevision}:{onChange:(value:ParticipantTracker)=>void;dirty:boolean;exercises:{id:string;revision:number}[];workshopRevision:number}){
 const [state,setState]=useState<ParticipantTracker|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const [completed,setCompleted]=useState<string[]>([]);
 const refresh=useCallback(async()=>{try{const s=await api<ParticipantTracker>('tracker');setState(s);onChange(s);setMessage('');}catch(e){setMessage((e as Error).message);}},[onChange]);
 useEffect(()=>{void refresh();},[refresh]);
 const scope=state?`${state.draftScope}:${workshopRevision}`:'';
 useEffect(()=>{
  const saved=()=>{if(!scope)return;try{const drafts=readDrafts(scope);setCompleted(exercises.filter(e=>drafts[e.id]?.revision===e.revision).map(e=>e.id));}catch{setMessage('Browser storage is unavailable. Allow local storage to save answers.');}};
  saved();window.addEventListener('workshop-answer-saved',saved);window.addEventListener('storage',saved);
  return()=>{window.removeEventListener('workshop-answer-saved',saved);window.removeEventListener('storage',saved);};
 },[scope,exercises]);
 const ready=submissionReady(state?{...state,started:true,completed,total:exercises.length}:null,dirty);
 useEffect(()=>{setConfirm(false);},[state?.runId,ready]);
 async function submit(){if(!ready||!confirm||busy)return;setBusy(true);try{
  const drafts=readDrafts(scope);
  const latest=await api<ParticipantTracker>('tracker');
  if(!latest.started)throw new Error('The presenter has not started submissions yet. Your answers remain saved here; try again when the presenter starts.');
  if(latest.draftScope!==state?.draftScope||(state?.runId&&latest.runId!==state.runId))throw new Error('Your participant or session changed. Reload before submitting.');
  const s=await post<ParticipantTracker>('tracker/submit',{runId:latest.runId,workshopRevision,answers:exercises.map(e=>drafts[e.id])});
  setState(s);onChange(s);setConfirm(false);setMessage('');
 }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="panel tracker-final" aria-label="Final submission">
  <div className="tracker-final-row">
  <div className="tracker-final-status">
  {!state?.submitted&&<div className="tracker-submit-controls">
   <button className="primary" disabled={!ready||!confirm||busy} onClick={submit}>{busy?'Submitting…':'SUBMIT YOUR FINAL RESULT'}</button>
   <label className="check-choice"><input type="checkbox" checked={confirm} disabled={!ready||busy} onChange={e=>setConfirm(e.target.checked)}/>I confirm that I want to submit my final results.</label>
  </div>}
  {!state?<p>Loading submission status…</p>:state.submitted?<><p className="success">Your final answers have been submitted.</p><p>Submitted {time(state.submittedAt!)}. Your answers are now locked.</p>{state.score!==undefined?<p className="tracker-score">Your result: {state.score} / {state.total}</p>:<p>Reload after the presenter reveals the results to see your score.</p>}</>:state.revealed?<p>Submissions are closed. The presenter has revealed the results.</p>:<>
   <p>{completed.length} of {exercises.length} answers saved on this browser.</p>
   {dirty&&<p>Save your current answer before submitting.</p>}
   {ready&&<p className="small muted">Your answers will be locked after submission.</p>}
  </>}
  {message&&<p className="error" role="alert">{message}</p>}
  </div>
  <a className="secondary tracker-manual-download" href="/guides/hands-on-session-instruction-manual.pdf" download="hands-on session instruction manual.pdf">Download instruction manual (PDF)</a>
  </div>
 </section>;
}

export function WorkshopTracker(){
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [step,setStep]=useState(0),[passcode,setPasscode]=useState(''),[checked,setChecked]=useState(false),[token,setToken]=useState('');
 async function refresh(){try{setData(await api<Dashboard>('admin/tracker'));setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},5000);return()=>clearInterval(timer);},[]);
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function cancel(){setStep(0);setPasscode('');setChecked(false);setToken('');}
 return <section className="panel tracker-dashboard">
  <div className="section-heading"><div><p className="eyebrow">WORKSHOP TRACKER</p><h2>Audience results</h2></div></div>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
  {!data?<p>Loading tracker…</p>:<>
   <div className="tracker-summary"><div><strong>{data.submissions.length}</strong><span>Final submissions</span></div><div><strong>{data.participants}</strong><span>Registered nicknames (includes earlier tests)</span></div><div><strong>{data.revealed?'Revealed':data.started?'Running':'Not started'}</strong><span>{data.startedAt?time(data.startedAt):'Start when your audience is ready'}</span></div></div>
   {data.keyError&&<p className="error">{data.keyError}</p>}
   <div className="actions"><button className="primary" disabled={busy||data.started||!!data.keyError} onClick={()=>action(async()=>{setData(await post<Dashboard>('admin/tracker/start',{}));})}>{data.started?'Tracker started':'Start tracker'}</button><button className="secondary" disabled={busy||!data.started||data.revealed} onClick={()=>{if(window.confirm('Reveal scores to participants and close final submissions?'))void action(async()=>{setData(await post<Dashboard>('admin/tracker/reveal',{}));});}}>Reveal results & close submissions</button></div>
   <p className="small muted">One point per exact classification match. Highest score first; ties use earliest final submission. Drafts stay in the participant’s browser; final submissions are accepted after Start. Results below are instructor-only.</p>
   <div className="tracker-table"><table><thead><tr><th>Rank</th><th>Nickname</th><th>Correct</th><th>Submitted</th></tr></thead><tbody>{data.submissions.map(r=><tr key={r.participant_id}><td>{r.rank}</td><td>{r.nickname}</td><td><strong>{r.score} / {r.total}</strong></td><td>{time(r.submitted_at)}</td></tr>)}</tbody></table>{!data.submissions.length&&<p>No final submissions yet.</p>}</div>
   <details><summary>Answer key & per-quiz results</summary><p>“Fully synthetic” means the whole scene is generated, not just a generated face swapped into a camera recording. Multiple selections must all match. Percentages below describe this workshop only.</p>{data.questions.map((q,i)=><section key={q.id} className="tracker-question"><h3>{i+1}. {q.title}</h3><p>Answer: <strong>{classifications(q.selections)}</strong></p><p className="small muted">{q.basis}</p><p>{q.correct} correct / {data.submissions.length} submissions{data.submissions.length?` (${Math.round(q.correct/data.submissions.length*100)}%)`:''}</p><div className="actions">{Object.entries(q.counts).map(([label,n])=><span className="notice" key={label}>{RECONSIDERED_LABELS[label as ReconsideredSelection]}: {n}</span>)}</div></section>)}</details>
   <details className="tracker-danger"><summary>Reset workshop data</summary><p>Clears ALL participant nicknames, saved answers and final submissions, including earlier tests. Media, detector results, exercises and configuration are preserved. Record any results you need before resetting. Cleared responses cannot be recovered through this page.</p>
    {!step?<button className="secondary" onClick={()=>{setStep(1);setNotice('');}}>Clear database…</button>:<div className="notice">
     {step===1?<><h3>Authorise reset</h3><label className="field-label" htmlFor="reset-passcode">Re-enter admin passcode</label><input id="reset-passcode" type="password" autoComplete="off" value={passcode} onChange={e=>setPasscode(e.target.value)}/><label className="check-choice"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>I understand that all participant answers, nicknames and final results will be permanently cleared.</label><button className="secondary" disabled={busy||!checked||!passcode} onClick={()=>action(async()=>{const d=await post<{token:string}>('admin/tracker/reset-prepare',{passcode,acknowledged:checked});setToken(d.token);setStep(2);})}>Continue to confirmation</button></>:step===2?<><h3>Confirmation 1 of 2</h3><p>Are you sure you want to clear every participant and response? This does not just clear the leaderboard.</p><button className="secondary" disabled={busy} onClick={()=>action(async()=>{await post('admin/tracker/reset-confirm',{passcode,acknowledged:checked,token});setStep(3);})}>Yes, continue to final confirmation</button></>:<><h3>Confirmation 2 of 2 — final warning</h3><p>This will permanently delete the workshop participant data and stop the tracker. Participants will need to join again.</p><button className="primary tracker-delete" disabled={busy} onClick={()=>action(async()=>{const r=await post<{cleared:{participants:number;answers:number;submissions:number}}>('admin/tracker/reset',{passcode,acknowledged:checked,token});cancel();await refresh();setNotice(`Cleared ${r.cleared.participants} participants, ${r.cleared.answers} answers and ${r.cleared.submissions} final submissions. Media and detector records were preserved.`);})}>Permanently clear workshop data</button></>}
     <button className="secondary" disabled={busy} onClick={cancel}>Cancel reset</button>
    </div>}
   </details>
  </>}
 </section>;
}
