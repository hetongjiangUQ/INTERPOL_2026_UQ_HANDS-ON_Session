'use client';
import {useEffect,useRef,useState} from 'react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {inspectPixels,type RgbaPixels,type BitChannel,type ChannelView,type DetailRadius,type DetailGain} from '@/lib/visual-inspection';
import {readPng} from '@/lib/png-lsb';

export function VisualInspector({mediaUrl,tool,simple=false}:{mediaUrl:string;tool:'layers'|'texture'|'highpass';simple?:boolean}){
 const [view,setView]=useState(tool==='layers'?'channels':tool==='highpass'?'detail':'edges'),[channel,setChannel]=useState<ChannelView>('grayscale'),[bit,setBit]=useState(0),[radius,setRadius]=useState<DetailRadius>(1),[gain,setGain]=useState<DetailGain>(4);
 const [source,setSource]=useState<{preview:RgbaPixels;bytes:Uint8Array;description:string;png:boolean}|null>(null),[exact,setExact]=useState<RgbaPixels|null>(null),[error,setError]=useState(''),[status,setStatus]=useState('Loading image…'),[pending,setPending]=useState(true);
 const original=useRef<HTMLCanvasElement>(null),output=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const abort=new AbortController();let active=true;setSource(null);setExact(null);setError('');setPending(true);
  (async()=>{
   const response=await fetch(mediaUrl,{signal:abort.signal});if(!response.ok)throw new Error('The exercise image could not be loaded.');
   if(Number(response.headers.get('content-length'))>20*1024*1024)throw new Error('Use an image under 20 MiB.');
   const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>20*1024*1024)throw new Error('Use an image under 20 MiB.');
   const url=URL.createObjectURL(new Blob([bytes]));
   try{
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,(simple?768:1024)/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true})!;
    context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
    if(active)setSource({preview:{width,height,data:context.getImageData(0,0,width,height).data},bytes,png:bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,description:`Original ${image.naturalWidth} × ${image.naturalHeight}; ${scale<1?'reduced':'native-size'} preview ${width} × ${height}. Browser-decoded RGB on a white background.`});
   }finally{URL.revokeObjectURL(url);}
  })().catch(e=>{if(active){setError(e.message);setPending(false);}});
  return()=>{active=false;abort.abort();};
 },[mediaUrl]);
 useEffect(()=>{if(!source)return;let active=true;setPending(true);setError('');
  (async()=>{
   let pixels=source.preview,description=source.description;
   if(view==='bits'){
    if(!source.png)throw new Error('Bit planes use original PNG samples. Choose Colour channels for JPEG or WebP.');
    if(exact)pixels=exact;
    else{
     const p=await readPng(source.bytes);if(p.width*p.height>4_000_000)throw new Error('Original bit planes support PNG images up to 4 million pixels. Use Colour channels for this image.');
     const rgba=new Uint8ClampedArray(p.width*p.height*4);for(let i=0;i<p.width*p.height;i++){rgba[i*4]=p.data[i*p.channels];rgba[i*4+1]=p.data[i*p.channels+1];rgba[i*4+2]=p.data[i*p.channels+2];rgba[i*4+3]=255;}
     pixels={width:p.width,height:p.height,data:rgba};if(active)setExact(pixels);
    }
    description=`Original stored PNG samples ${pixels.width} × ${pixels.height}; no resampling or colour correction. Alpha ignored, including RGB under transparent pixels. White = 1; black = 0.`;
   }
   if(!active)return;
   const result=view==='channels'?inspectPixels(pixels,{kind:'channel',channel}):view==='bits'?inspectPixels(pixels,{kind:'bit-plane',channel:channel as BitChannel,bit}):view==='detail'?inspectPixels(pixels,{kind:'detail',radius,gain}):inspectPixels(pixels,{kind:'edges'});
   if(view==='edges')for(let i=0;i<result.data.length;i+=4)for(let c=0;c<3;c++)result.data[i+c]=Math.min(255,result.data[i+c]*gain);
   for(const [canvas,data] of [[original.current,pixels],[output.current,result]] as const){if(canvas){canvas.width=data.width;canvas.height=data.height;canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data.data),data.width,data.height),0,0);}}
   setStatus(description);setPending(false);
  })().catch(e=>{if(active){setError(e.message);setPending(false);}});
  return()=>{active=false;};
 },[source,exact,view,channel,bit,radius,gain]);
 const modes=tool==='layers'?(simple?[['channels','Colour channels']]:[['channels','Colour channels'],['bits','Bit planes (PNG)']]):(simple?[['edges','Edges']]:[['edges','Edges'],['detail','Fine detail']]);
 const selectedLabel=view==='channels'?`${channel==='grayscale'?'Greyscale':channel.toUpperCase()+' channel'}`:view==='bits'?`${channel.toUpperCase()} · bit ${bit}`:view==='edges'?`Edges · ${gain}×`:`High-pass detail · ${radius*2+1} × ${radius*2+1} · ${gain}×`;
 return <section className="visual-inspector">{!simple&&tool==='layers'&&<fieldset><legend>View</legend><RadioGroup className="visual-modes" value={view} onValueChange={v=>{if(v==='bits'&&channel==='grayscale')setChannel('r');setView(String(v));}}>{modes.map(([id,label])=><label className="choice" key={id}><RadioGroupItem value={id} disabled={id==='bits'&&!!source&&!source.png}/>{label}</label>)}</RadioGroup></fieldset>}
  <div className="decoder-controls">{tool==='layers'?<><label>Channel<NativeSelect value={channel} onChange={e=>setChannel(e.target.value as ChannelView)}>{(view==='bits'?['r','g','b']:['grayscale','r','g','b']).map(c=><NativeSelectOption key={c} value={c}>{({grayscale:'Greyscale',r:'Red',g:'Green',b:'Blue'} as Record<string,string>)[c]}</NativeSelectOption>)}</NativeSelect></label>{view==='bits'&&<label>Bit number<NativeSelect value={bit} onChange={e=>setBit(Number(e.target.value))}>{Array.from({length:8},(_,i)=><NativeSelectOption value={i} key={i}>Bit {i}{i===0?' · smallest':i===7?' · largest':''}</NativeSelectOption>)}</NativeSelect></label>}</>:!simple?<>{view==='detail'&&<label>Detail scale<NativeSelect value={radius} onChange={e=>setRadius(Number(e.target.value) as DetailRadius)}>{[1,2,4].map((r,i)=><NativeSelectOption value={r} key={r}>{['Small','Medium','Broad'][i]} · {r*2+1} × {r*2+1}</NativeSelectOption>)}</NativeSelect></label>}<label>Amplification<NativeSelect value={gain} onChange={e=>setGain(Number(e.target.value) as DetailGain)}>{[1,4,12].map((g,i)=><NativeSelectOption key={g} value={g}>{g}× · {['low','medium','high'][i]}</NativeSelectOption>)}</NativeSelect></label></>:<p className="small muted">Edges highlighted at a fixed 4× amplification.</p>}</div>
  {tool==='layers'&&!simple&&source&&!source.png&&<p className="small muted">Bit planes require a supported PNG. Colour channels work with this file.</p>}
  <div className="visual-pair" hidden={!!error||pending}><figure><figcaption>Original {view==='bits'?'stored RGB':'preview'}</figcaption><canvas ref={original} aria-label="Original comparison pixels"/></figure><figure><figcaption>{selectedLabel}</figcaption><canvas ref={output} aria-label={selectedLabel}/></figure></div>
  <p role="status" className={error?'error':'small muted'}>{error|| (pending?'Preparing the selected view…':status)}</p>
  <p className="notice">A highlighted pattern is a clue to examine, not a deepfake verdict. Compare a known authentic image under the same settings.</p>
 </section>;
}
