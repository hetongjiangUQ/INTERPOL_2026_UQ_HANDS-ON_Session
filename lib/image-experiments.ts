export const EXPERIMENT_MODELS=['community','univfd'] as const;
export type ExperimentModel=typeof EXPERIMENT_MODELS[number];
export type ExperimentVariant={id:string;file:string;sha256:string;bytes:number;width:number;height:number;region:'full'|'center50';resolution:'original'|'768'|'384';encoding:'original'|'png'|'jpeg90'|'jpeg50';processing:string;scores:Record<ExperimentModel,number>;mediaId?:string;bundledPath?:string};
export type ExperimentPack={schemaVersion:1;model:'experiments';protocol:'image-robustness-v1';mediaSha256:string;createdAt:string;models:Record<ExperimentModel,{modelVersion:string;preprocessing:string}>;variants:ExperimentVariant[]};
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const str=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max;
export function validateExperimentPack(input:unknown,sourceHash:string):ExperimentPack{
 const p=input as ExperimentPack;
 if(!p||p.schemaVersion!==1||p.model!=='experiments'||p.protocol!=='image-robustness-v1')throw new Error('Unsupported image experiment package.');
 if(!hash(sourceHash)||p.mediaSha256!==sourceHash)throw new Error('Experiment package does not match the original image SHA-256.');
 if(!str(p.createdAt,80)||!Number.isFinite(Date.parse(p.createdAt)))throw new Error('Invalid experiment date.');
 for(const m of EXPERIMENT_MODELS)if(!p.models?.[m]||!str(p.models[m].modelVersion,300)||!str(p.models[m].preprocessing,2000))throw new Error('Both detector versions and preprocessing records are required.');
 if(!Array.isArray(p.variants)||p.variants.length!==19)throw new Error('Expected the original and all 18 crop, size and encoding combinations.');
 const ids=new Set<string>(),combos=new Set<string>();
 const variants=p.variants.map(v=>{
  if(!v||!str(v.id,80)||!/^[a-z0-9-]+$/.test(v.id)||ids.has(v.id))throw new Error('Invalid or duplicate variant ID.');ids.add(v.id);
  if(!str(v.file,120)||!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(v.file)||!hash(v.sha256)||!Number.isInteger(v.bytes)||v.bytes<1||v.bytes>20*1024*1024)throw new Error('Invalid experiment file record.');
  if(!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<1||v.height<1||v.width*v.height>40_000_000||!str(v.processing,2000))throw new Error('Invalid variant dimensions or processing record.');
  if(!['full','center50'].includes(v.region)||!['original','768','384'].includes(v.resolution)||!['original','png','jpeg90','jpeg50'].includes(v.encoding))throw new Error('Unsupported experiment settings.');
  const combo=[v.region,v.resolution,v.encoding].join('/');if(combos.has(combo))throw new Error('Duplicate experiment settings.');combos.add(combo);
  if((v.id==='original')!==(v.encoding==='original'))throw new Error('Only the original record can use the original encoding.');
  if(v.id==='original'&&(v.sha256!==sourceHash||v.region!=='full'||v.resolution!=='original'))throw new Error('Invalid original-image record.');
  for(const m of EXPERIMENT_MODELS)if(typeof v.scores?.[m]!=='number'||!Number.isFinite(v.scores[m])||v.scores[m]<0||v.scores[m]>1)throw new Error('Both real detector scores must be between 0 and 1.');
  if(v.mediaId!==undefined&&(!str(v.mediaId,80)||!/^[a-zA-Z0-9-]+$/.test(v.mediaId)))throw new Error('Invalid variant media reference.');
  if(v.bundledPath!==undefined&&v.bundledPath!==`/experiments/${v.sha256}.${v.encoding==='jpeg90'||v.encoding==='jpeg50'?'jpg':'png'}`)throw new Error('Invalid bundled variant path.');
  if(v.mediaId&&v.bundledPath)throw new Error('Ambiguous variant media reference.');
  return {id:v.id,file:v.file,sha256:v.sha256,bytes:v.bytes,width:v.width,height:v.height,region:v.region,resolution:v.resolution,encoding:v.encoding,processing:v.processing,scores:{community:v.scores.community,univfd:v.scores.univfd},...(v.mediaId?{mediaId:v.mediaId}:{}),...(v.bundledPath?{bundledPath:v.bundledPath}:{})};
 });
 if(!ids.has('original'))throw new Error('Original-image baseline is missing.');
 for(const r of ['full','center50'])for(const s of ['original','768','384'])for(const e of ['png','jpeg90','jpeg50'])if(!combos.has(`${r}/${s}/${e}`))throw new Error('An experiment combination is missing.');
 return {schemaVersion:1,model:'experiments',protocol:'image-robustness-v1',mediaSha256:sourceHash,createdAt:p.createdAt,models:{community:{modelVersion:p.models.community.modelVersion,preprocessing:p.models.community.preprocessing},univfd:{modelVersion:p.models.univfd.modelVersion,preprocessing:p.models.univfd.preprocessing}},variants};
}
export function findVariant(pack:ExperimentPack,region:ExperimentVariant['region'],resolution:ExperimentVariant['resolution'],encoding:ExperimentVariant['encoding']){return pack.variants.find(v=>v.region===region&&v.resolution===resolution&&v.encoding===encoding);}
