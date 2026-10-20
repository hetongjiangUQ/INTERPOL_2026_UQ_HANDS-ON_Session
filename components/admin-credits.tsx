'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import type {DetectorAcknowledgement} from '@/lib/acknowledgements';
import {CLASSIFICATION_GUIDANCE} from '@/lib/domain';
type Credits={detectors:DetectorAcknowledgement[];policy:{heading:string;summary:string;warning:string};evidence:string[];media:{title:string;creator:string;source:string|null;license:string;licenseUrl:string|null;changes:string}[]};
export function AdminCredits(){
 const [data,setData]=useState<Credits|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<Credits>('admin/credits').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 if(error)return <p className="error" role="alert">{error}</p>;
 if(!data)return <p role="status">Loading credits…</p>;
 return <section className="panel"><h2>Credits and sources</h2>
  <p>Media descriptions include source labels and are for instructor review.</p>
  <p>{CLASSIFICATION_GUIDANCE}</p>
  <h3>{data.policy.heading}</h3><p>{data.policy.summary}</p><p>{data.policy.warning}</p>
  <h3>Detection tools</h3>{data.detectors.map(d=><article key={d.name}><h4>{d.name} · {d.publication}</h4><p><a href={d.paper} target="_blank" rel="noreferrer">Paper</a> · <a href={d.repository} target="_blank" rel="noreferrer">Official repository</a></p><p>{d.scope} {d.scoreMeaning}</p></article>)}
  <h3>Current workshop media</h3>{data.media.map(m=><article key={m.title}><h4>{m.title}</h4><p>{m.creator}</p><p>{m.source&&<><a href={m.source} target="_blank" rel="noreferrer">Source</a> · </>}{m.licenseUrl?<a href={m.licenseUrl} target="_blank" rel="noreferrer">{m.license}</a>:m.license}</p><p style={{overflowWrap:'anywhere'}}>{m.changes}</p></article>)}
  <h3>Branding and workshop interface</h3><p>UQ and UQ Cyber logos were supplied by the presenter. They remain institutional branding assets, not generally reusable project assets. Inspection aids and the educational watermark lab are first-party workshop interfaces.</p>
  <h3>Interpreting the evidence</h3><ul>{data.evidence.map(s=><li key={s}>{s}</li>)}</ul>
 </section>;
}
