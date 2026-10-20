import type {QuizQuestion} from './quiz-bank.ts';
export const TOOL_INFO = {
  speed: { name: 'Compare playback speeds', kinds: ['video'], description: 'Watch at normal or quarter speed, then consider what smooth or unusual motion can establish.' },
  crop: { name: 'Reveal the full context', kinds: ['image'], description: 'Start with a central crop, then reveal the full image. Consider what was outside the frame.' },
  compression: { name: 'Compression comparison', kinds: ['image'], description: 'Compare the same image before and after ordinary JPEG compression or downsizing. No detector or score.' },
  timeline: { name: 'Pause and replay', kinds: ['video'], description: 'Pause a moment, replay its surroundings and compare. Timeline seeking is approximate.' },
  experiments: { name: 'Image experiments', kinds: ['image'], description: 'Adjust crop, size and encoding. Compare real, precomputed scores from two detectors on the exact derived files.' },
  layers: { name: 'Colour and bit planes', kinds: ['image'], description: 'Separate colour channels or inspect one stored PNG bit at a time. Runs locally; it does not give an authenticity score.' },
  texture: { name: 'Edges', kinds: ['image'], description: 'Highlight boundaries with adjustable amplification. Strong edges also occur in authentic images.' },
  highpass: { name: 'High-pass detail', kinds: ['image'], description: 'Subtract a box-blurred preview and amplify the absolute differences to show fine detail. Not an authenticity detector.' },
  metadata: { name: 'File information', kinds: ['image','video','audio'], description: 'Read format, size and SHA-256. Missing metadata is not proof of manipulation.' },
  ela: { name: 'JPEG residual view', kinds: ['image'], description: 'Compare pixels after JPEG recompression. Edges and recompression also create residuals.' },
  frames: { name: 'Video frame inspection', kinds: ['video'], description: 'Pause, move through the timeline and examine a frame. Frame evidence does not establish temporal consistency.' },
  spectrum: { name: 'Audio waveform', kinds: ['audio','video'], description: 'Inspect amplitude over time. This is a viewing aid, not a spoof detector.' },
  univfd: { name: 'UniversalFakeDetect', kinds: ['image','video'], description: 'CVPR 2023 visual baseline. On video, scores sampled frames only. Scores are raw model outputs, not probabilities.' },
  aasist: { name: 'AASIST-L', kinds: ['audio','video'], description: '2022 speech anti-spoofing baseline. Reports a bona-fide logit, not a percentage or an authenticity verdict.' },
  community: { name: 'Community Forensics · 2025', kinds: ['image','video'], description: 'CVPR 2025 detector trained across many generators. On video, it scores sampled images only.' },
  spai: { name: 'SPAI · 2025', kinds: ['image','video'], description: 'CVPR 2025 spectral-learning detector. For video here, it scores sampled frames independently; it is not temporal analysis.' },
  aide: { name: 'AIDE · 2025', kinds: ['image','video'], description: 'ICLR 2025 hybrid detector. For video here, it scores sampled frames independently using the released GenImage checkpoint.' },
  gend: { name: 'GenD · 2026', kinds: ['image','video'], description: 'WACV 2026 face-manipulation detector. Uses YuNet face crops and frame aggregation (modified preprocessing); it is not temporal analysis.' },
  fatformer: { name: 'FatFormer · 2024', kinds: ['image','video'], description: 'CVPR 2024 image-forgery classifier using the released ProGAN four-class checkpoint. Video use here scores sampled frames only.' },
  rawnetlite: { name: 'RawNetLite · 2025', kinds: ['audio'], description: 'Lightweight speech-spoofing detector. The first three seconds are analysed. New voices and generators can produce errors.' },
  lsb: { name: 'LSB payload explorer', kinds: ['image'], description: 'Extract candidate bytes from low pixel bits in PNG images. Only selected schemes are supported; readable output can occur by chance.' },
  zsteg: { name: 'zsteg · saved extraction', kinds: ['image'], description: 'A real zsteg scan/extraction run on the workstation. Supports several PNG/BMP schemes; it is not a universal decoder.' },
} as const;
export const MODEL_IDS=['univfd','aasist','community','spai','aide','gend','fatformer','rawnetlite'] as const;
export type ModelId=typeof MODEL_IDS[number];
export const isModel=(id:string):id is ModelId=>(MODEL_IDS as readonly string[]).includes(id);
export const isSavedTool=(id:string)=>isModel(id)||id==='zsteg';
export type ToolId = keyof typeof TOOL_INFO;
export type MediaKind = 'image'|'video'|'audio';
export type Verdict = 'authentic'|'manipulated'|'uncertain';
export const CLASSIFICATION_GUIDANCE = 'Here, authentic means camera-origin content, not necessarily an untouched file. “Real photo edited” means changes to depicted content, not routine colour adjustment, resizing, compression or metadata removal.';
export const RECONSIDERED_SELECTIONS=['authentic_capture','synthetic_generation','face_swap','photo_edited','unsure'] as const;
export type ReconsideredSelection=typeof RECONSIDERED_SELECTIONS[number];
export type ReconsideredResponse={schemaVersion:1;selections:ReconsideredSelection[]};
export const RECONSIDERED_LABELS:Record<ReconsideredSelection,string>={
  authentic_capture:'Authentic',
  synthetic_generation:'Fully synthetic',
  face_swap:'Face swap',
  photo_edited:'Real photo edited',
  unsure:'Not enough evidence',
};
export type Exercise = { id:string; title:string; prompt:string; kind:MediaKind; mediaId:string|null; mediaUrl:string; bytes:number; mime:string; sha256:string; tools:ToolId[]; published:boolean; revealed:boolean; truth?:Verdict; explanation?:string; placeholder:boolean; revision:number; quizQuestion?:QuizQuestion; scenarioOnly?:boolean };
export type Assessment = { initial:Verdict; initialConfidence:number|null; initialNotes:string; revised:Verdict|null; revisedConfidence:number|null; revisedNotes:string|null; reconsideredResponse:ReconsideredResponse|null };
export type ScoreType='synthetic_sigmoid'|'synthetic_softmax'|'bonafide_logit'|'manipulation_score'|'spoof_score'|'decoded_payload';
export const SCORE_INFO:Record<ScoreType,{label:string;explanation:string}>={
 synthetic_sigmoid:{label:'synthetic-image score',explanation:'Higher values lean toward the model’s synthetic class. This raw model score is not a probability that the evidence is fake.'},
 synthetic_softmax:{label:'synthetic-image softmax output',explanation:'Higher values lean toward the model’s synthetic class. Although bounded from 0 to 1, this raw output is not a probability that the evidence is fake.'},
 bonafide_logit:{label:'bona-fide logit',explanation:'Higher values lean toward bona fide in this model. There is no universal threshold for new recordings.'},
 manipulation_score:{label:'face-manipulation score',explanation:'Higher values lean toward the manipulated class for the analysed face crops. This raw model score is not a probability and does not establish provenance.'},
 spoof_score:{label:'speech-spoofing score',explanation:'Higher values lean toward synthetic/spoofed speech. This raw model score is not a probability and can miss new generators.'},
 decoded_payload:{label:'extraction findings',explanation:'These are candidate extracted bytes, not a confidence score. A readable string alone does not establish a deliberately hidden message.'},
};
export type DetectorResult = { schemaVersion:1; model:ModelId|'zsteg'; modelVersion:string; mediaSha256:string; preprocessing:string; createdAt:string; score:number|null; scoreType:ScoreType; samples?:{timeSeconds:number;score:number}[]|null; findings?:{method:string;preview:string}[]; note:string };
export function formatModelScore(value:number):string {
  if(value===0)return '0.000';
  const magnitude=Math.abs(value);
  if(magnitude>=0.001)return value.toFixed(3);
  if(magnitude>=0.000001)return value.toFixed(6);
  return value.toExponential(2);
}
export function textValue(value:unknown,max:number,name:string):string { if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${name} must contain 1–${max} characters.`); return value.trim(); }
export function verdict(value:unknown):Verdict { if(!['authentic','manipulated','uncertain'].includes(value as string))throw new Error('Choose a valid judgement.');return value as Verdict; }
export function confidence(value:unknown):number {if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>100)throw new Error('Confidence must be between 0 and 100.');return value;}
export function reconsideredResponse(value:unknown):ReconsideredResponse {
  const response=value as Partial<ReconsideredResponse>|null;
  if(!response||response.schemaVersion!==1||!Array.isArray(response.selections)||response.selections.length<1||response.selections.length>3)throw new Error('Choose at least one valid classification.');
  const selections=response.selections as unknown[];
  if(selections.some(item=>typeof item!=='string'||!(RECONSIDERED_SELECTIONS as readonly string[]).includes(item))||new Set(selections).size!==selections.length)throw new Error('Choose valid classifications without duplicates.');
  if(selections.includes('unsure')&&selections.length!==1)throw new Error('Not enough evidence cannot be combined with another classification.');
  const canonical=RECONSIDERED_SELECTIONS.filter(item=>selections.includes(item));
  return {schemaVersion:1,selections:canonical};
}
export function parseReconsideredResponse(value:unknown):ReconsideredResponse|null {
  if(value==null||value==='')return null;
  try{return reconsideredResponse(typeof value==='string'?JSON.parse(value):value);}catch{return null;}
}
export function validateResult(value:unknown,hash:string):DetectorResult {
  const r=value as DetectorResult;
  if(!r||r.schemaVersion!==1||!isSavedTool(r.model))throw new Error('Unsupported detector result format.');
  if(r.mediaSha256!==hash||!/^[a-f0-9]{64}$/.test(hash))throw new Error('The result does not match this media file (SHA-256).');
  textValue(r.modelVersion,300,'Model version');textValue(r.preprocessing,2000,'Preprocessing');textValue(r.note,3000,'Result note');
  if(!Number.isFinite(Date.parse(r.createdAt)))throw new Error('Invalid result date.');
  if(r.model==='zsteg'){
    if(r.score!==null||r.scoreType!=='decoded_payload'||!Array.isArray(r.findings)||r.findings.length>40)throw new Error('Invalid extraction result.');
    r.findings.forEach(f=>{textValue(f.method,200,'Extraction method');textValue(f.preview,2000,'Extracted data');});
  }else if(typeof r.score!=='number'||!Number.isFinite(r.score))throw new Error('Invalid detector score.');
  if(['univfd','community','spai','aide'].includes(r.model)&&(r.scoreType!=='synthetic_sigmoid'||r.score===null||r.score<0||r.score>1))throw new Error('Invalid synthetic-image score.');
  if(r.model==='fatformer'&&(r.scoreType!=='synthetic_softmax'||r.score===null||r.score<0||r.score>1))throw new Error('Invalid FatFormer synthetic-image score.');
  if(r.model==='aasist'&&r.scoreType!=='bonafide_logit')throw new Error('AASIST requires a bona-fide logit.');
  if(r.model==='gend'&&(r.scoreType!=='manipulation_score'||r.score===null||r.score<0||r.score>1))throw new Error('Invalid face-manipulation score.');
  if(r.model==='rawnetlite'&&(r.scoreType!=='spoof_score'||r.score===null||r.score<0||r.score>1))throw new Error('Invalid speech-spoofing score.');
  if(r.samples!=null&&(!Array.isArray(r.samples)||r.samples.length>100||r.samples.some(s=>!Number.isFinite(s.timeSeconds)||s.timeSeconds<0||!Number.isFinite(s.score)||(r.model!=='aasist'&&(s.score<0||s.score>1)))))throw new Error('Invalid sample results.');
  return {schemaVersion:1,model:r.model,modelVersion:r.modelVersion,mediaSha256:hash,preprocessing:r.preprocessing,createdAt:r.createdAt,score:r.score,scoreType:r.scoreType,samples:r.samples??undefined,findings:r.model==='zsteg'?r.findings:undefined,note:r.note};
}
