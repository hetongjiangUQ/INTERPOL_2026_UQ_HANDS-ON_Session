'use client';
import {visibleAnswerOptions, validateAnswer} from '@/lib/answer-options';
import {readDrafts,saveDraft,type AnswerDraft} from '@/lib/answer-drafts';
import {FinalSubmission,type ParticipantTracker} from './workshop-tracker';
import { useEffect, useRef, useState } from 'react';
import { Header } from './header';
import { MediaInspector } from './media-inspector';
import { AuthenticReferences } from './authentic-references';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api } from '@/lib/client';
import { useWorkshop } from './workshop-provider';
import {
  RECONSIDERED_LABELS,
  CLASSIFICATION_GUIDANCE,
  type Exercise,
  type Verdict,
  type ReconsideredSelection,
} from '@/lib/domain';
import {
  inspectionAvailable,
  type PracticeConfig,
} from '@/lib/workshop-config';
import { quizCandidate } from '@/lib/quiz-bank';
import { PARTICIPANT_FEATURES as features } from '@/lib/participant-features';
const labels = {
  authentic: 'Appears authentic',
  manipulated: 'Appears AI-generated or manipulated',
};
type LiveExercise = Exercise & { practice: PracticeConfig };
const documentedSourceLabel = (truth: Exercise['truth']) =>
  !truth || truth === 'uncertain'
    ? 'No binary source label'
    : truth === 'authentic'
      ? 'Documented source label: authentic'
      : 'Documented source label: AI-generated or manipulated';
export function Training() {
  const [tracker,setTracker]=useState<ParticipantTracker|null>(null),[dirty,setDirty]=useState(false);
  const { snapshot, error: configError, reload } = useWorkshop();
  const requestVersion = useRef(0);
  const [exercises, setExercises] = useState<LiveExercise[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  async function refresh() {
    const request = ++requestVersion.current;
    try {
      const d = await api<{
        exercises: LiveExercise[];
        workshopRevision: number;
      }>('exercises');
      if (request !== requestVersion.current) return;
      setExercises(d.exercises);
      setRevision(d.workshopRevision);
      setSelected((id) =>
        d.exercises.some((e) => e.id === id) ? id : d.exercises[0]?.id || '',
      );
      setError('');
    } catch (e) {
      if (request === requestVersion.current) setError((e as Error).message);
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (snapshot) refresh();
  }, [snapshot?.revision]);
  const index = exercises.findIndex((x) => x.id === selected),
    e = exercises[index];
  return (
    <>
      <Header />
      <main className="page training-page">
        <div className="session-heading">
          <div>
            <p className="eyebrow">HANDS-ON · DEEPFAKE DETECTION</p>
            <h1>{e?.title ?? 'Quizzes'}</h1>

          </div>
        </div>
        {(error || configError) && (
          <div className="error" role="alert">
            {error || configError}{' '}
            <button
              onClick={() => {
                refresh();
                reload();
              }}
            >
              Refresh
            </button>
          </div>
        )}
        {loading || !snapshot ? (
          <p role="status">Loading the session…</p>
        ) : !exercises.length ? (
          <section className="panel narrow">
            <h2>
              {features.watermark && snapshot.config.watermark.enabled
                ? 'Your practice: hide and recover a message'
                : 'Waiting for your instructor'}
            </h2>
            <p>
              {features.watermark && snapshot.config.watermark.enabled
                ? 'Use the supplied image to try a watermark, recover its text and see what compression changes.'
                : 'Practices will appear here when your instructor opens them.'}
            </p>
            {features.watermark && snapshot.config.watermark.enabled && (
              <a className="primary inline" href="/steganography">
                Start watermark practice
              </a>
            )}
          </section>
        ) : (
          <section className="quiz-column" aria-label="Current quiz">
            <FinalSubmission onChange={setTracker} dirty={dirty} exercises={exercises} workshopRevision={revision}/>
            <div className="practice-progress">
              <span>
                {e?.kind.toUpperCase()} · ABOUT {quizCandidate(e?.id ?? '')?.minutes ?? 2} MIN
              </span>
              <nav className="actions" aria-label="Practice navigation">
                {exercises.map((x, i) => (
                  <button
                    key={x.id}
                    className={
                      selected === x.id ? 'secondary selected' : 'secondary'
                    }
                    aria-current={selected === x.id ? 'step' : undefined}
                    onClick={() => setSelected(x.id)}
                    aria-label={'Session ' + (i + 1) + ': ' + x.title}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </div>
            {e && (<ExerciseView
                  key={e.id + ':' + e.practice.mode}
                  exercise={e}
                  workshopRevision={revision}
                  onNext={
                    index < exercises.length - 1
                      ? () => setSelected(exercises[index + 1].id)
                      : undefined
                  }
                  watermark={features.watermark && !!snapshot.config.watermark.enabled}
                  refresh={refresh}
                  tracker={tracker}
                  onDirty={setDirty}
                />
              )}
          </section>
        )}

      </main>
    </>
  );
}
function ExerciseView({
  exercise:e, workshopRevision, onNext, refresh, tracker,onDirty,
}: {
  exercise:LiveExercise; workshopRevision:number; onNext?:()=>void;
  watermark:boolean; refresh:()=>void;
  tracker:ParticipantTracker|null;onDirty:(dirty:boolean)=>void;
}) {
  const [assessment,setAssessment]=useState<AnswerDraft|null>(null);
  const [choice,setChoice]=useState<Verdict|null>(null);
  const [selections,setSelections]=useState<ReconsideredSelection[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const scope=tracker?`${tracker.draftScope}:${workshopRevision}`:'';
  useEffect(()=>{
    if(!scope)return;
    try{
      const draft=readDrafts(scope)[e.id];
      const saved=draft?.revision===e.revision?draft:null;
      setAssessment(saved);setChoice(saved?.verdict??null);setSelections(saved?.selections??[]);
    }catch{setMessage('Browser storage is unavailable. Allow local storage to save answers.');}
    setLoading(false);
  },[e.id,e.revision,scope]);
  const locked=!!tracker?.submitted||!!tracker?.revealed||e.revealed;
  const disabled=loading||busy||locked;
  const saved=assessment?.selections??[];
  const current=!!saved.length && selections.length===saved.length && selections.every(s=>saved.includes(s));
  useEffect(()=>{onDirty(!locked&&!current);},[locked,current,onDirty]);
  let valid=false;
  try{validateAnswer(e.id,choice,selections);valid=true;}catch{}
  function changeChoice(value:Verdict){
    setChoice(value);setMessage('');
    setSelections(value==='authentic'?['authentic_capture']:selections.filter(s=>s!=='authentic_capture'&&s!=='unsure'));
  }
  async function save(){
    setBusy(true);setMessage('');
    try{
      if(!scope||!choice)throw new Error('Session is not ready.');
      const draft={id:e.id,verdict:choice,selections,revision:e.revision};
      saveDraft(scope,draft);
      setAssessment(draft);setMessage('Saved on this browser. You can change it before final submission.');
    }catch(err){setMessage((err as Error).message);}
    finally{setBusy(false);}
  }
  return <div className="participant-exercise">
    <MediaInspector key={e.id+':'+e.revision+':'+workshopRevision}
      exercise={e} unlocked={inspectionAvailable(!!assessment)} simple={!e.practice.advanced} participantHeader={<></>}
      comparisonReference={<AuthenticReferences />}/>
    <section className="answer-panel assessment panel" aria-labelledby={'answer-'+e.id}>
      <p className="eyebrow">YOUR ANSWER</p>
      <h2 id={'answer-'+e.id}>Your answer</h2>
      <p className="small muted">{CLASSIFICATION_GUIDANCE}</p>
      <p className="small muted">{locked?'This answer is locked.':'You can change your answer before final submission.'}</p>
      <RadioGroup aria-label="Your judgement" value={choice??''} disabled={disabled}
        onValueChange={v=>{if(!disabled)changeChoice(v as Verdict);}}>
        {(['authentic','manipulated'] as const).map(v=><label className="choice" key={v}>
          <RadioGroupItem value={v} disabled={disabled}/>{labels[v]}
        </label>)}
      </RadioGroup>
      {choice==='manipulated'&&<fieldset className="classification-options" disabled={disabled}>
        <legend className="field-label">Classification — select all that apply</legend>
        {visibleAnswerOptions(e.id,choice).map(s=><label className="check-choice" key={s}>
          <Checkbox checked={selections.includes(s)} disabled={disabled}
            onCheckedChange={checked=>{
              if(s==='authentic_capture'){changeChoice('authentic');return;}
              setChoice('manipulated');setMessage('');
              setSelections(previous=>checked?[...previous.filter(x=>x!=='authentic_capture'&&x!==s),s]:previous.filter(x=>x!==s));
            }}/><span>{RECONSIDERED_LABELS[s]}</span>
        </label>)}
      </fieldset>}
      {!locked&&<button className="primary full" onClick={save} disabled={disabled||!valid||current}>
        {busy?'Saving…':current?'Answer saved':'Save answer'}
      </button>}
      {message&&<p className="notice" role="status">{message}</p>}
      {current&&onNext&&<button className="secondary full" onClick={onNext}>Next quiz →</button>}
      {current&&!onNext&&<p className="success">This answer is saved. You can revisit any quiz using the numbered buttons.</p>}
      {e.revealed&&<div className="debrief"><h3>{documentedSourceLabel(e.truth)}</h3><p>{e.explanation}</p></div>}
    </section>
  </div>;
}
