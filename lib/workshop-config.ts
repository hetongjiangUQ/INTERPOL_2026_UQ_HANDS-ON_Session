import {TOOL_INFO, type Exercise, type ToolId} from './domain.ts';
import {quizCandidate,RECOMMENDED_QUIZZES} from './quiz-bank.ts';

/** Retained switch for a possible blind-first-answer workshop variant. */
export const INSPECTION_REQUIRES_FIRST_ANSWER = false;
export const inspectionAvailable = (
  hasInitialAnswer:boolean,
  requiresFirstAnswer=INSPECTION_REQUIRES_FIRST_ANSWER,
) => !requiresFirstAnswer || hasInitialAnswer;

// Browser inspection and explicitly selected, previously computed detector results.
export const SIMPLE_TOOLS = ['crop','compression','timeline','speed','layers','texture','highpass','ela','frames','spectrum','lsb'] as const;
export type SimpleTool = typeof SIMPLE_TOOLS[number];
export const SESSION_DETECTORS = ['univfd','community','spai','aide','gend','fatformer'] as const;
export type SessionDetector = typeof SESSION_DETECTORS[number];
export const isSessionDetector = (id:string):id is SessionDetector => (SESSION_DETECTORS as readonly string[]).includes(id);
export const SESSION_DETECTOR_PRESENTATION:Record<SessionDetector,{name:string;task:string}> = {
  univfd:{name:'UniversalFakeDetect',task:'General synthetic image'},
  community:{name:'Community Forensics',task:'Multi-generator synthetic image'},
  spai:{name:'SPAI',task:'Spectral synthetic-image evidence'},
  aide:{name:'AIDE',task:'Noise + semantic evidence'},
  gend:{name:'GenD',task:'Face manipulation'},
  fatformer:{name:'FatFormer',task:'Whole-image forgery'},
};
export type DetectorRowState='not-revealed'|'requires-face'|'not-run'|'no-result'|'load-error';
export type DetectorLoadState='loaded'|'no-result'|'load-error';
export function detectorRowState(revealed:boolean,configured:boolean,loadState?:DetectorLoadState,unavailableReason?:'requires-face'):DetectorRowState {
  if(!revealed)return 'not-revealed';
  if(unavailableReason)return unavailableReason;
  if(!configured)return 'not-run';
  return loadState==='load-error'?'load-error':loadState==='no-result'?'no-result':'not-run';
}
export const detectorRowText=(state:DetectorRowState):string=>({
  'not-revealed':'Not revealed',
  'requires-face':'N/A — requires a detectable face',
  'not-run':'Not run — no cached result',
  'no-result':'N/A — detector returned no score',
  'load-error':'Unavailable — could not load',
})[state];
export const SESSION_TOOLS = [...SIMPLE_TOOLS,...SESSION_DETECTORS] as const;
export type SessionTool = typeof SESSION_TOOLS[number];
export type PracticeConfig = {
  id: string; enabled: boolean; mode: 'judgement'|'explore'; tools: SessionTool[]; confidence: boolean;
  notes: 'hidden'|'optional'|'required'; allowRevision: boolean; advanced: boolean;
};
export type WatermarkConfig = {
  enabled: boolean; method: 'blue-lsb'|'blue-dct'; methodChoice: boolean;
  uploads: boolean; recovery: boolean; transforms: boolean; details: boolean; download: boolean;
};
export type WorkshopConfig = {practices: PracticeConfig[]; watermark: WatermarkConfig};
export type WorkshopSnapshot = {revision: number; config: WorkshopConfig};
export function practiceDefaults(id:string):PracticeConfig {
  const quiz=quizCandidate(id);
  if(quiz)return {id,enabled:false,mode:quiz.mode,tools:[...quiz.tools] as SessionTool[],confidence:quiz.mode==='judgement',notes:'optional',allowRevision:true,advanced:false};
  const recipe:Record<string,SimpleTool>={'guided-crop':'crop','guided-compression':'compression','guided-video':'timeline'};
  return {id, enabled:false, mode:Object.hasOwn(recipe,id)?'explore':'judgement', tools:Object.hasOwn(recipe,id)?[recipe[id]]:[], confidence:true, notes:'optional', allowRevision:true, advanced:false};
}
export function recommendedQuizSession(config:WorkshopConfig):WorkshopConfig {
  const selected=RECOMMENDED_QUIZZES.map(id=>({...practiceDefaults(id),enabled:true}));
  return {...config,practices:[...selected,...config.practices.filter(p=>!RECOMMENDED_QUIZZES.includes(p.id as typeof RECOMMENDED_QUIZZES[number])).map(p=>({...p,enabled:false}))],watermark:{...config.watermark}};
}
export const DEFAULT_WORKSHOP:WorkshopConfig = {
  practices: RECOMMENDED_QUIZZES.map(id=>({...practiceDefaults(id),enabled:true})),
  watermark:{enabled:true, method:'blue-lsb', methodChoice:true, uploads:true, recovery:true, transforms:false, details:true, download:false},
};
function bool(value:unknown):boolean {if(typeof value!=='boolean')throw new Error('Settings must use true or false.');return value;}
export function validateWorkshop(value:unknown):WorkshopConfig {
  const c=value as WorkshopConfig;
  if(!c||!Array.isArray(c.practices)||c.practices.length>100||!c.watermark)throw new Error('Invalid session configuration.');
  const ids=new Set<string>();
  const practices=c.practices.map(p=>{
    if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||ids.has(p.id))throw new Error('Each practice must have a unique valid ID.');
    ids.add(p.id);
    if(!Array.isArray(p.tools)||p.tools.length>10||p.tools.some(t=>String(t)!=='metadata'&&!SESSION_TOOLS.includes(t))||new Set(p.tools).size!==p.tools.length)throw new Error('Choose supported inspection tools or saved detectors.');
    const mode=p.mode??'judgement';if(!['judgement','explore'].includes(mode))throw new Error('Choose judgement or guided exploration.');
    if(quizCandidate(p.id)?.scenario&&(mode!=='explore'||p.tools.length))throw new Error('Scenario questions use guided exploration without media tools.');
    if(quizCandidate(p.id)?.portrait&&(mode!=='judgement'||p.tools.length))throw new Error('Portrait evidence cases use the fixed judgement and evidence sequence.');
    if(p.tools.includes('crop')&&(mode!=='explore'||p.tools.length!==1))throw new Error('Full-context reveal must be a standalone guided practice so the full image stays hidden.');
    if(!['hidden','optional','required'].includes(p.notes))throw new Error('Choose a valid notes setting.');
    return {id:p.id,enabled:bool(p.enabled),mode,tools:p.tools.filter(t=>String(t)!=='metadata'),confidence:bool(p.confidence),notes:p.notes,allowRevision:bool(p.allowRevision),advanced:bool(p.advanced)};
  });
  const w=c.watermark;if(!['blue-lsb','blue-dct'].includes(w.method))throw new Error('Choose a supported watermark method.');
  return {practices,watermark:{enabled:bool(w.enabled),method:w.method,methodChoice:bool(w.methodChoice),uploads:bool(w.uploads),recovery:bool(w.recovery),transforms:bool(w.transforms),details:bool(w.details),download:bool(w.download)}};
}
export function practiceConfig(config:WorkshopConfig,id:string):PracticeConfig {return config.practices.find(p=>p.id===id)??practiceDefaults(id);}
export function participantExercise(e:Exercise,config:WorkshopConfig): (Exercise & {practice:PracticeConfig}) | null {
  const p=practiceConfig(config,e.id);
  if(!e.published||!p.enabled)return null;
  return {...e,title:quizCandidate(e.id)?.title??e.title,tools:p.tools.filter(id=>(TOOL_INFO[id].kinds as readonly string[]).includes(e.kind)) as ToolId[],practice:e.placeholder?{...p,mode:'explore'}:p};
}
/** Current session selection is authoritative, independently of legacy library tools. */
export function participantDetectorAccess(e:Exercise,config:WorkshopConfig,model:string,hasInitial:boolean,requiresFirstAnswer=INSPECTION_REQUIRES_FIRST_ANSWER):0|403|404 {
  const view=participantExercise(e,config);
  if(!view||e.placeholder||!isSessionDetector(model)||!view.tools.includes(model))return 404;
  return view.practice.mode==='judgement'&&!inspectionAvailable(hasInitial,requiresFirstAnswer)?403:0;
}
export function assessmentNotes(value:unknown,mode:PracticeConfig['notes']):string {
  if(typeof value!=='string'||value.length>3000)throw new Error('Notes must be text, up to 3,000 characters.');
  if(mode==='required'&&!value.trim())throw new Error('Add a short reason before saving.');
  return mode==='hidden'?'':value.trim();
}
