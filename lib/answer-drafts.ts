import {validateAnswer} from './answer-options.ts';
import type {ReconsideredSelection,Verdict} from './domain.ts';
export type AnswerDraft={id:string;revision:number;verdict:Verdict;selections:ReconsideredSelection[]};
const key=(scope:string)=>'workshop-answer-drafts-v1:'+scope;
export function clearWorkshopDrafts(storage:Pick<Storage,'length'|'key'|'removeItem'>){
 const keys=Array.from({length:storage.length},(_,i)=>storage.key(i));
 for(const name of keys)if(name?.startsWith('workshop-answer-drafts-v1:'))storage.removeItem(name);
}
export function readDrafts(scope:string):Record<string,AnswerDraft>{
 const raw=localStorage.getItem(key(scope));
 if(!raw)return {};
 try{const parsed=JSON.parse(raw),result:Record<string,AnswerDraft>={};
  for(const d of Object.values(parsed) as AnswerDraft[]){
   if(!d||typeof d.id!=='string'||!Number.isInteger(d.revision))continue;
   try{validateAnswer(d.id,d.verdict,d.selections);result[d.id]=d;}catch{}
  }return result;
 }catch{return {};}
}
export function saveDraft(scope:string,draft:AnswerDraft){
 validateAnswer(draft.id,draft.verdict,draft.selections);
 localStorage.setItem(key(scope),JSON.stringify({...readDrafts(scope),[draft.id]:draft}));
 window.dispatchEvent(new Event('workshop-answer-saved'));
}
