import data from './examples-data.server.json';
import {controlledVideo} from './controlled-video.server';
import videos from './video-cases.server.json';
import {controlledFaceSwapStillData} from './controlled-face-swap-still.server';
import {userImageCasesData} from './user-image-cases.server';
export const bundledUrl=(id:string)=>(id===controlledVideo.mediaId?controlledVideo.url:undefined)??data.find(e=>e.mediaId===id)?.url??videos.find(e=>e.mediaId===id)?.url??(controlledFaceSwapStillData().case.mediaId===id?controlledFaceSwapStillData().case.url:userImageCasesData().cases.find(e=>e.mediaId===id)?.url);
export async function ensureExamples(db:D1Database){
 const existing=await db.prepare("SELECT id FROM media WHERE id IN ('bundled-media-01','bundled-media-02')").all<{id:string}>();
 const missing=data.filter(e=>!existing.results.some(x=>x.id===e.mediaId));
 if(!missing.length)return;
 const statements=[];const now=new Date().toISOString();
 for(const e of missing){
  statements.push(db.prepare('INSERT OR IGNORE INTO media(id,object_key,mime,bytes,sha256,created_at) VALUES (?,?,?,?,?,?)').bind(e.mediaId,'bundled:'+e.url,e.mime,e.bytes,e.sha256,now));
 }
 await db.batch(statements);
}
