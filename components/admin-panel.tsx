'use client';
import {useEffect,useState} from 'react';
import {Header} from './header';
import {WorkshopTracker} from './workshop-tracker';
import {AdminCredits} from './admin-credits';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {api,post} from '@/lib/client';

export function AdminPanel(){
 const [access,setAccess]=useState<{instructorAuthenticated:boolean;localLogin:boolean}|null>(null);
 const [key,setKey]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=()=>api('session').then(setAccess);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 async function login(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{await post('local-login',{key});setKey('');await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <><Header instructor/><main className="page"><h1>Admin</h1>
  {error&&<p className="error" role="alert">{error}</p>}
  {!access?<p>Loading…</p>:access.instructorAuthenticated?<>
   <button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await post('logout',{});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Sign out</button>
   <Tabs defaultValue="tracker">
    <TabsList aria-label="Admin sections"><TabsTrigger value="tracker">Audience tracker</TabsTrigger><TabsTrigger value="credits">Credits</TabsTrigger></TabsList>
    <TabsContent value="tracker"><WorkshopTracker/></TabsContent>
    <TabsContent value="credits"><AdminCredits/></TabsContent>
   </Tabs>
  </>:<section className="panel narrow"><h2>Admin sign-in</h2>{access.localLogin?<form onSubmit={login}>
   <label className="field-label" htmlFor="admin-key">Admin passcode</label><input id="admin-key" type="password" autoComplete="current-password" value={key} onChange={e=>setKey(e.target.value)} required/>
   <button className="primary" disabled={busy||!key}>Sign in</button>
  </form>:<p>Admin authentication is not configured.</p>}</section>}
 </main></>;
}
