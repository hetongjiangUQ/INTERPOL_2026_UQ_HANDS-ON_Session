// Deployment/readiness inventory, not a detector accuracy ranking.
export const PORTRAIT_MODELS = [
  {id:'community',name:'Community Forensics',venue:'CVPR 2025',repo:'JeongsooP/Community-Forensics',scope:'Whole image',cost:'Lower',reason:'Single ViT-small pass at 384 px. A sensible first live-inference candidate.',state:'available',detail:'Existing CPU adapter; released author checkpoint.'},
  {id:'univfd',name:'UniversalFakeDetect',venue:'CVPR 2023 · retained baseline',repo:'WisconsinAIVision/UniversalFakeDetect',scope:'Whole image',cost:'Moderate',reason:'CLIP ViT-L/14; keep the backbone loaded between requests.',state:'available',detail:'Existing CPU adapter. Retained in addition to the 18 recent candidates.'},
  {id:'spai',name:'SPAI',venue:'CVPR 2025',repo:'mever-team/spai',scope:'Whole image',cost:'Higher / resolution-dependent',reason:'Processes multiple original-resolution patches. Large images increase work.',state:'available',detail:'Apache-2.0 source and weights; CPU adaptation of released inference.'},
  {id:'aide',name:'AIDE',venue:'ICLR 2025',repo:'shilinyan99/AIDE',scope:'Whole image',cost:'Higher',reason:'Large ConvNeXt-XXL backbone plus two noise experts and patch processing. Queue jobs and load one large model at a time.',state:'available',detail:'Existing CPU adapter; GenImage-trained author checkpoint. Code licence and model/dataset terms are separate.'},
  {id:'gend',name:'GenD',venue:'WACV 2026',repo:'yermandy/GenD',scope:'Face manipulation',cost:'Moderate',reason:'Face detection/alignment plus CLIP-L/14. No-face input must return inconclusive.',state:'available',detail:'Existing YuNet-based adapter. Face preprocessing differs from the paper; fully synthetic portraits are a transfer test, not a face-swap benchmark.'},
  {id:'fatformer',name:'FatFormer',venue:'CVPR 2024',repo:'Michel-liu/FatFormer',scope:'Whole image',cost:'Moderate–higher',reason:'CLIP-L/14 with forgery adapters and frequency processing. The repo’s four-GPU example is a batch-evaluation command, not a minimum requirement.',state:'available',detail:'Apache-2.0 source; released ProGAN four-class checkpoint. Strictly loaded CPU adaptation with official test preprocessing.'},
] as const;

export type PortraitModelId = typeof PORTRAIT_MODELS[number]['id'];
export type PortraitMeasurement = {
  model:PortraitModelId;status:'ok'|'error'|'inconclusive';score?:number;scoreType?:string;
  modelVersion?:string;preprocessing?:string;note?:string;error?:string;
  mediaSha256:string;createdAt:string;warmMedianSeconds?:number;warmSeconds?:number[];
  firstPassSeconds?:number;modelSetupSeconds?:number;coldFirstResultSeconds?:number;peakRssBytes?:number;
  checkpointBytes?:number;artifacts?:{name:string;sha256:string;bytes:number}[];
};
export type PortraitMap = {
  model:'mesorch'|'sparsevit';mediaSha256:string;createdAt:string;modelVersion:string;preprocessing:string;note:string;
  warmMedianSeconds:number;warmSeconds:number[];firstPassSeconds:number;modelSetupSeconds:number;coldFirstResultSeconds:number;peakRssBytes:number;
  artifacts:{name:string;sha256:string;bytes:number}[];maskSha256:string;width:number;height:number;min:number;max:number;mean:number;
};
export type PortraitCaseId = 'hard-authentic'|'hard-synthetic';
export type PortraitCase = {
  id:PortraitCaseId;title:string;dataset:string;sourceUrl:string;credit:string;licence:string;licenceUrl:string;licenceNotice?:string;
  useStatus:'cleared'|'evaluation-only';
  selection?:'source-selected'|'purpose-selected';selectionNote?:string;
  evidence:string;limitations:string;originalName:string;sha256:string;bytes:number;width:number;height:number;
  measurements:PortraitMeasurement[];maps?:PortraitMap[];
};
export type PortraitHardPairData = {schemaVersion:1;createdAt:string;protocol:string;cases:PortraitCase[]};
export const PORTRAIT_QUIZ_CLASSIFIERS = ['univfd','community','spai','aide','gend','fatformer'] as const;
export type PortraitQuizClassifierId = typeof PORTRAIT_QUIZ_CLASSIFIERS[number];
export type PortraitQuizEvidence = {
  schemaVersion:1;mediaSha256:string;
  classifiers:(Pick<PortraitMeasurement,'status'|'score'|'scoreType'|'modelVersion'|'preprocessing'|'note'|'mediaSha256'|'createdAt'> & {model:PortraitQuizClassifierId})[];
  maps:Pick<PortraitMap,'model'|'mediaSha256'|'createdAt'|'modelVersion'|'preprocessing'|'maskSha256'|'width'|'height'|'min'|'max'|'mean'>[];
  selectionContext?:string;
};

export function redactPortraitQuizEvidence(c:PortraitCase):PortraitQuizEvidence {
  const classifiers=PORTRAIT_QUIZ_CLASSIFIERS.map(model=>c.measurements.find(result=>result.model===model)).filter(result=>result?.status==='ok').map(result=>({
    model:result!.model as PortraitQuizClassifierId,status:result!.status,score:result!.score,scoreType:result!.scoreType,
    modelVersion:result!.modelVersion,preprocessing:result!.preprocessing,note:result!.note,mediaSha256:result!.mediaSha256,createdAt:result!.createdAt,
  }));
  const maps=(c.maps||[]).map(({model,mediaSha256,createdAt,modelVersion,preprocessing,maskSha256,width,height,min,max,mean})=>({model,mediaSha256,createdAt,modelVersion,preprocessing,maskSha256,width,height,min,max,mean}));
  if(classifiers.length!==PORTRAIT_QUIZ_CLASSIFIERS.length||![0,2].includes(maps.length))throw new Error('Portrait quiz evidence is incomplete.');
  return {schemaVersion:1,mediaSha256:c.sha256,classifiers,maps,...(c.selection==='purpose-selected'&&c.selectionNote?{selectionContext:c.selectionNote}:{})};
}

function validatePortraitCases(cases:PortraitCase[],expectedCases:Set<PortraitCaseId>){
  if(cases.length!==expectedCases.size||new Set(cases.map(c=>c.id)).size!==expectedCases.size||cases.some(c=>!expectedCases.has(c.id)))throw new Error('Invalid portrait comparison package.');
  const ids=new Set<string>(PORTRAIT_MODELS.map(m=>m.id));
  for(const c of cases){
    if(!['cleared','evaluation-only'].includes(c.useStatus)||!/^[a-f0-9]{64}$/.test(c.sha256)||c.bytes<=0||c.width<=0||c.height<=0)throw new Error('Invalid portrait source record.');
    if(c.selection&&!['source-selected','purpose-selected'].includes(c.selection))throw new Error('Invalid portrait selection record.');
    if(c.selection==='purpose-selected'&&(!c.selectionNote||c.selectionNote.length>1000))throw new Error('Purpose-selected portraits require a concise disclosure.');
    if(new Set(c.measurements.map(r=>r.model)).size!==c.measurements.length)throw new Error('Duplicate portrait detector record.');
    for(const r of c.measurements){
      if(!ids.has(r.model)||r.mediaSha256!==c.sha256)throw new Error('Portrait measurement does not match its image.');
      if(r.status==='ok'){
        if(typeof r.score!=='number'||!Number.isFinite(r.score)||r.score<0||r.score>1||!r.modelVersion||!r.preprocessing)throw new Error('Invalid measured portrait score.');
      }else if(!['error','inconclusive'].includes(r.status)||r.score!==undefined)throw new Error('Failed detector must not contain a score.');
      for(const value of [r.warmMedianSeconds,r.firstPassSeconds,r.modelSetupSeconds,r.coldFirstResultSeconds,r.peakRssBytes])if(value!==undefined&&(!Number.isFinite(value)||value<0))throw new Error('Invalid portrait timing or memory record.');
    }
    const masks=c.maps||[];
    if(new Set(masks.map(m=>m.model)).size!==masks.length)throw new Error('Duplicate localisation mask.');
    for(const m of masks){
      if(!['mesorch','sparsevit'].includes(m.model)||m.mediaSha256!==c.sha256||!/^[a-f0-9]{64}$/.test(m.maskSha256)||m.width<1||m.height<1||m.width*m.height>4_000_000)throw new Error('Invalid localisation mask binding.');
      if([m.min,m.max,m.mean].some(n=>!Number.isFinite(n)||n<0||n>1)||m.min>m.mean||m.mean>m.max)throw new Error('Invalid localisation mask values.');
      if([m.warmMedianSeconds,m.firstPassSeconds,m.modelSetupSeconds,m.coldFirstResultSeconds,m.peakRssBytes].some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid localisation measurements.');
    }
  }
}

export function validatePortraitHardPair(data:PortraitHardPairData):PortraitHardPairData {
  if(data.schemaVersion!==1)throw new Error('Invalid portrait stress-pair package.');
  validatePortraitCases(data.cases,new Set<PortraitCaseId>(['hard-authentic','hard-synthetic']));
  for(const c of data.cases){
    if(c.selection!=='purpose-selected'||(c.maps?.length??0)!==0)throw new Error('Invalid portrait stress-pair disclosure or localisation record.');
    redactPortraitQuizEvidence(c);
  }
  return data;
}
