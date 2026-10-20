'use client';
import {useState} from 'react';
import {post} from '@/lib/client';
import {clearWorkshopDrafts} from '@/lib/answer-drafts';
export function ResetBrowserSession(){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function reset(){
  setBusy(true);setError('');
  try{
   await post('reset-browser-session',{});
   clearWorkshopDrafts(localStorage);
   sessionStorage.removeItem('evidence-lab-portrait-pair-zoom');
   window.location.assign('/');
  }catch(e){setError('Could not complete the reset. '+(e as Error).message);setBusy(false);}
 }
 return <div>
  {!confirm?<button type="button" className="secondary" onClick={()=>setConfirm(true)}>Reset this browser session</button>:<div className="panel" role="group" aria-label="Confirm browser reset">
   <p>Sign out and erase unsent answers saved on this browser? You will need to enter your nickname and passcode again. Submitted results on the server will not be deleted.</p>
   <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button><button type="button" className="primary" disabled={busy} onClick={reset}>{busy?'Resetting…':'Clear local answers and sign out'}</button></div>
  </div>}
  {error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
