import {crc32} from './steganography.ts';
export type Pixels={width:number;height:number;channels:number;data:Uint8Array};
// Decode stored samples, avoiding browser colour correction or alpha premultiplication.
export async function readPng(input:Uint8Array):Promise<Pixels>{
 if(input.length>16*1024*1024)throw new Error('Use a PNG smaller than 16 MiB.');
 if(input.length<33||[137,80,78,71,13,10,26,10].some((b,i)=>input[i]!==b))throw new Error('This is not a PNG file.');
 const view=new DataView(input.buffer,input.byteOffset,input.byteLength);let width=0,height=0,channels=0,ended=false;const parts:Uint8Array[]=[];
 for(let at=8;at+12<=input.length;){
  const length=view.getUint32(at),end=at+12+length;if(end>input.length)throw new Error('Truncated PNG chunk.');
  const type=String.fromCharCode(...input.subarray(at+4,at+8)),data=input.subarray(at+8,at+8+length);
  if(crc32(input.subarray(at+4,at+8+length))!==view.getUint32(at+8+length))throw new Error('PNG checksum failed.');
  if(at===8&&type!=='IHDR')throw new Error('Missing PNG header.');
  if(type==='IHDR'){
   if(width||length!==13)throw new Error('Invalid PNG header.');
   width=view.getUint32(at+8);height=view.getUint32(at+12);channels=data[9]===2?3:data[9]===6?4:0;
   if(!width||!height||width*height>8_000_000)throw new Error('Use a PNG with at most 8 million pixels.');
   if(data[8]!==8||!channels||data[10]||data[11]||data[12])throw new Error('Supported: non-interlaced 8-bit RGB or RGBA PNG. Palette, greyscale and 16-bit images need a format-specific workstation tool. Converting may destroy the hidden bits.');
  }else if(type==='IDAT')parts.push(data);
  else if(type==='acTL')throw new Error('Animated PNG is not supported.');
  else if(type==='IEND'){ended=true;break;}
  at=end;
 }
 if(!ended||!parts.length)throw new Error('Incomplete PNG.');
 const packed=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let pos=0;for(const p of parts){packed.set(p,pos);pos+=p.length;}
 const stride=width*channels,expected=(stride+1)*height,raw=new Uint8Array(expected);
 const reader=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();pos=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;if(pos+value.length>expected)throw new Error('PNG expands beyond its declared dimensions.');raw.set(value,pos);pos+=value.length;}}finally{await reader.cancel();}
 if(pos!==expected)throw new Error('PNG pixel data is incomplete.');
 const pixels=new Uint8Array(width*height*channels);
 for(let y=0;y<height;y++){
  const filter=raw[y*(stride+1)];if(filter>4)throw new Error('Unknown PNG row filter.');
  for(let x=0;x<stride;x++){
   const p=y*stride+x,a=x>=channels?pixels[p-channels]:0,b=y?pixels[p-stride]:0,c=y&&x>=channels?pixels[p-stride-channels]:0;
   const prediction=a+b-c,pa=Math.abs(prediction-a),pb=Math.abs(prediction-b),pc=Math.abs(prediction-c);
   const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   pixels[p]=(raw[y*(stride+1)+x+1]+predictor)&255;
  }
 }
 return {width,height,channels,data:pixels};
}
export type LsbOptions={bits:number;channels:string;order:'xy'|'yx';packing:'lsb'|'msb';limit:number};
export const DEFAULT_LSB:LsbOptions={bits:1,channels:'rgb',order:'xy',packing:'lsb',limit:512};
export function extractLsb(image:Pixels,options:LsbOptions):Uint8Array{
 const {bits,channels,order,packing,limit}=options;
 if(!Number.isInteger(bits)||bits<1||bits>4||!['rgb','bgr','r','g','b'].includes(channels)||!['xy','yx'].includes(order)||!['lsb','msb'].includes(packing)||!Number.isInteger(limit)||limit<1||limit>4096)throw new Error('Unsupported extraction settings.');
 const output:number[]=[];let byte=0,count=0;const indexes=Array.from(channels,c=>'rgba'.indexOf(c));
 for(let i=0;i<image.width*image.height;i++){
  const x=order==='xy'?i%image.width:Math.floor(i/image.height),y=order==='xy'?Math.floor(i/image.width):i%image.height;
  for(const channel of indexes){const value=image.data[(y*image.width+x)*image.channels+channel];
   for(let bit=bits-1;bit>=0;bit--){byte|=((value>>bit)&1)<<(packing==='lsb'?7-count:count);count++;if(count===8){output.push(byte);byte=0;count=0;if(output.length===limit)return Uint8Array.from(output);}}
  }
 }
 return Uint8Array.from(output);
}
export function previewBytes(bytes:Uint8Array){return {text:Array.from(bytes,b=>b===10||b===13||b===9||b>=32&&b<=126?String.fromCharCode(b):'·').join(''),hex:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(' ')};}

