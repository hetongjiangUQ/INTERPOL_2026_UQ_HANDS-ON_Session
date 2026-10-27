'use client';
import {useState} from 'react';
import {post} from '@/lib/client';
import {clearWorkshopDrafts} from '@/lib/answer-drafts';
export function SignOut(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function signOut(){
  setBusy(true);setError('');
  try{
   await post('reset-browser-session',{});
  }catch(e){setError('Could not sign out. '+(e as Error).message);setBusy(false);return;}
  try{clearWorkshopDrafts(localStorage);}catch{}
  try{sessionStorage.removeItem('evidence-lab-portrait-pair-zoom');}catch{}
  window.location.assign('/');
 }
 return <div className="header-signout-wrap">
  <button type="button" className="header-signout" disabled={busy} onClick={signOut}>{busy?'Signing out…':'Sign out'}</button>
  {error&&<p role="alert" className="header-signout-error">{error}</p>}
 </div>;
}
