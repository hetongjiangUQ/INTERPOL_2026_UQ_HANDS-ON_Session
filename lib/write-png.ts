import {crc32} from './steganography.ts';
import type {RgbaPixels} from './visual-inspection.ts';
// Lossless, 8-bit RGB PNG writer. Fixed filter 0 avoids browser colour conversion
// when exporting a teaching watermark in exact channel samples.
export async function writePng(image:RgbaPixels):Promise<Uint8Array>{
 const {width,height,data}=image;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4_000_000||data.length!==width*height*4)throw new Error('Invalid image for PNG export.');
 const raw=new Uint8Array((width*3+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++)raw[y*(width*3+1)+1+x*3+c]=data[(y*width+x)*4+c];
 const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 function chunk(type:string,payload:Uint8Array){const result=new Uint8Array(payload.length+12),view=new DataView(result.buffer);view.setUint32(0,payload.length);result.set(new TextEncoder().encode(type),4);result.set(payload,8);view.setUint32(result.length-4,crc32(result.subarray(4,result.length-4)));return result;}
 const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=2;
 const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())];
 const png=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){png.set(p,at);at+=p.length;}return png;
}
