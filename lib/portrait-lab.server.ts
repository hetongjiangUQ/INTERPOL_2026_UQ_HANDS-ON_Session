import hardPairPackaged from './portrait-hard-pair-data.server.json';
import {redactPortraitQuizEvidence,validatePortraitHardPair,type PortraitHardPairData,type PortraitQuizEvidence} from './portrait-catalog';

const portraitQuizCases = {'quiz-portrait-d':'hard-authentic','quiz-portrait-e':'hard-synthetic'} as const;
export function portraitQuizCase(exerciseId:string){return portraitQuizCases[exerciseId as keyof typeof portraitQuizCases]??null;}

export function portraitHardPairData(){return validatePortraitHardPair(hardPairPackaged.data as PortraitHardPairData);}
export function portraitQuizCasesData(){return portraitHardPairData().cases;}
export function portraitQuizEvidence(exerciseId:string):PortraitQuizEvidence|null {
  const id=portraitQuizCase(exerciseId);if(!id)return null;
  const c=portraitQuizCasesData().find(item=>item.id===id);if(!c)return null;
  return redactPortraitQuizEvidence(c);
}
export async function portraitMedia(id:string){
  const record=portraitHardPairData().cases.find(c=>c.id===id);if(!record)return null;
  const assets=hardPairPackaged.assets as Record<string,{base64:string;sha256:string;mime:string}>;
  const asset=assets[id];if(!asset)return null;
  const bytes=Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==asset.sha256||digest!==record.sha256||bytes.length!==record.bytes)throw new Error('Portrait source checksum mismatch.');
  return new Response(bytes,{headers:{'Content-Type':asset.mime,'Content-Length':String(bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
