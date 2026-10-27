'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {api} from '@/lib/client';
import type {WorkshopSnapshot} from '@/lib/workshop-config';
const Context=createContext<{snapshot:WorkshopSnapshot|null;error:string;reload:()=>void}>({snapshot:null,error:'',reload:()=>{}});
export function WorkshopProvider({children}:{children:ReactNode}){
  const pathname=usePathname(),participantRoute=pathname==='/hands-on'||pathname==='/steganography';
  const [snapshot,setSnapshot]=useState<WorkshopSnapshot|null>(null),[error,setError]=useState('');
  async function refresh(){try{const next=await api<WorkshopSnapshot>('workshop');setSnapshot(old=>old&&old.revision>=next.revision?old:next);setError('');}catch(e){setError((e as Error).message);}}
  useEffect(()=>{if(participantRoute)void refresh();},[participantRoute]);
  return <Context.Provider value={{snapshot,error,reload:refresh}}>{children}</Context.Provider>;
}
export const useWorkshop=()=>useContext(Context);
export function WorkshopGate({children}:{children:ReactNode}){
  const {snapshot,error,reload}=useWorkshop();
  if(!snapshot)return <main className="page"><p role="status">{error||'Loading session…'}</p>{error&&<button className="secondary" onClick={reload}>Retry</button>}</main>;
  if(!snapshot.config.watermark.enabled)return <main className="page"><h1>This practice is not open</h1><p>Your instructor has not included it in this session.</p><a className="primary inline" href="/hands-on">Return to the session</a></main>;
  return children;
}
