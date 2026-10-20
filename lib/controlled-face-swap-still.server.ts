import packaged from './controlled-face-swap-still.server.json' with {type:'json'};
import {validateResult,type DetectorResult,type Verdict} from './domain.ts';

const EXPECTED_ID='quiz-faceswap-still-v3';
const EXPECTED_MODELS=['univfd','community','spai','aide','gend','fatformer'] as const;

export type ControlledFaceSwapStill={
  id:string;mediaId:string;kind:'image';title:string;url:string;mime:'image/png';
  bytes:number;sha256:string;truth:Verdict;prompt:string;explanation:string;results:DetectorResult[];
};
export type ControlledFaceSwapStillData={
  schemaVersion:1;createdAt:string;
  source:{title:string;version:string;creator:string;studyUrl:string;datasetUrl:string;licence:string;licenceUrl:string;groundTruthBasis:string;methodStatus:string;identityStatus:string;reviewStatus:string;sourceSha256:string;targetSha256:string};
  case:ControlledFaceSwapStill;
};

function text(value:unknown,name:string){if(typeof value!=='string'||!value.trim())throw new Error(`Controlled face-swap ${name} is missing.`);return value;}
export function validateControlledFaceSwapStill(value:unknown):ControlledFaceSwapStillData{
  const data=structuredClone(value) as ControlledFaceSwapStillData;
  if(!data||data.schemaVersion!==1||!Number.isFinite(Date.parse(data.createdAt)))throw new Error('Invalid controlled face-swap package header.');
  for(const key of ['title','version','creator','studyUrl','datasetUrl','licence','licenceUrl','groundTruthBasis','methodStatus','identityStatus','reviewStatus','sourceSha256','targetSha256'] as const)text(data.source?.[key],`source ${key}`);
  if(!/^[a-f0-9]{64}$/.test(data.source.sourceSha256)||!/^[a-f0-9]{64}$/.test(data.source.targetSha256))throw new Error('Invalid controlled face-swap source or target hash.');
  const item=data.case;
  if(!item||item.id!==EXPECTED_ID||item.kind!=='image'||item.truth!=='manipulated')throw new Error('Unexpected controlled face-swap case identity or type.');
  for(const key of ['mediaId','title','url','mime','prompt','explanation'] as const)text(item[key],`${item.id} ${key}`);
  if(!Number.isSafeInteger(item.bytes)||item.bytes<1||!/^[a-f0-9]{64}$/.test(item.sha256))throw new Error(`Invalid media record for ${item.id}.`);
  if(!item.url.startsWith('/samples/faceswap/')||item.mime!=='image/png')throw new Error('Unexpected controlled face-swap media location or MIME.');
  if(!Array.isArray(item.results)||JSON.stringify(item.results.map(row=>row.model))!==JSON.stringify(EXPECTED_MODELS))throw new Error(`${item.id} must contain the six expected detector records.`);
  item.results=item.results.map(row=>validateResult(row,item.sha256));
  return data;
}

export const controlledFaceSwapStillData=()=>validateControlledFaceSwapStill(packaged);
export const controlledFaceSwapStillCase=(id:string)=>{
  const data=controlledFaceSwapStillData();
  return data.case.id===id?data.case:null;
};
