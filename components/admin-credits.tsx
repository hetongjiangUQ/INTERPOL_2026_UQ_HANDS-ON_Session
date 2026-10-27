'use client';

import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import {CURRENT_QUIZ_MEDIA_CREDITS,type DetectorAcknowledgement} from '@/lib/acknowledgements';
import {quizCandidate} from '@/lib/quiz-bank';

type MediaCredit={title:string;creator:string;source:string|null;license:string;licenseUrl:string|null;changes:string};
type Credits={detectors:DetectorAcknowledgement[];media:MediaCredit[]};

function MediaDetails({media}:{media:MediaCredit}){
 return <div className="credits-card-body">
  <p><strong>Creator:</strong> {media.creator}</p>
  <p>{media.source&&<><strong>Source:</strong> <a href={media.source} target="_blank" rel="noreferrer">Original record</a> · </>}<strong>Reuse terms:</strong> {media.licenseUrl?<a href={media.licenseUrl} target="_blank" rel="noreferrer">{media.license}</a>:media.license}</p>
  <p className="credits-changes">{media.changes}</p>
 </div>;
}

export function AdminCredits({review=false}:{review?:boolean}={}){
 const [data,setData]=useState<Credits|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<Credits>(review?'review/references':'admin/credits').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[review]);
 if(error)return <p className="error" role="alert">{error}</p>;
 if(!data)return <p role="status">Loading credits…</p>;

 const mediaByTitle=new Map(data.media.map(item=>[item.title,item]));
 const quizTitles=new Set<string>(CURRENT_QUIZ_MEDIA_CREDITS.map(item=>item.assetTitle));
 const otherAssets=data.media.filter(item=>!quizTitles.has(item.title));

 return <section className="panel credits-page">
  <header className="credits-intro">
   <h2>Credits and sources</h2>
   <p>{review?'These references include source labels and quiz answers.':'Media descriptions include source labels and are for instructor review.'}</p>
  </header>

  <section className="credits-category" aria-labelledby="credits-tools-heading">
   <h3 id="credits-tools-heading">Tools</h3>
   <h4>Detection models</h4>
   <div className="credits-detectors">
    {data.detectors.map(d=><article className="credits-card" key={d.name}>
     <h5>{d.name} <span className="credits-publication">· {d.publication}</span></h5>
     <p><a href={d.paper} target="_blank" rel="noreferrer">Paper</a> · <a href={d.repository} target="_blank" rel="noreferrer">Official repository</a></p>
     <p>{d.scope} {d.scoreMeaning}</p>
    </article>)}
   </div>
   <h4>Workshop inspection and watermark tools</h4>
   <p>Inspection aids and the educational watermark lab are first-party workshop interfaces.</p>
  </section>

  <section className="credits-category" aria-labelledby="credits-assets-heading">
   <h3 id="credits-assets-heading">Assets</h3>
   <h4>Quiz media</h4>
   <ol className="credits-quiz-list">
    {CURRENT_QUIZ_MEDIA_CREDITS.map(({quizId,assetTitle},index)=>{
     const media=mediaByTitle.get(assetTitle);
     return <li className="credits-card" key={quizId} value={index+1}>
      <div className="credits-quiz-heading">
       <span className="credits-quiz-number">Quiz {index+1}</span>
       <div><h5>{quizCandidate(quizId)?.title??assetTitle}</h5>{media&&<p className="credits-asset-name">Asset: {media.title}</p>}</div>
      </div>
      {media?<MediaDetails media={media}/>:<p className="error">Credit record unavailable for this quiz asset.</p>}
     </li>;
    })}
   </ol>
   <h4>Comparison references and watermark input</h4>
   <div className="credits-other-assets">
    {otherAssets.map(media=><article className="credits-card" key={media.title}>
     <h5>{media.title}</h5><MediaDetails media={media}/>
    </article>)}
   </div>
  </section>

  <section className="credits-category" aria-labelledby="credits-branding-heading">
   <h3 id="credits-branding-heading">Branding</h3>
   <p>UQ and UQ Cyber logos were supplied by the presenter. They remain institutional branding assets, not generally reusable project assets.</p>
  </section>
 </section>;
}
