import {readPng} from './png-lsb.ts';
import type {RgbaPixels} from './visual-inspection.ts';
export async function exactPngPixels(bytes:Uint8Array):Promise<RgbaPixels>{
 const image=await readPng(bytes);if(image.width*image.height>4_000_000)throw new Error('Use a PNG with at most 4 million pixels.');
 const data=new Uint8ClampedArray(image.width*image.height*4);
 for(let p=0;p<image.width*image.height;p++){for(let c=0;c<3;c++)data[p*4+c]=image.data[p*image.channels+c];data[p*4+3]=255;}
 return {width:image.width,height:image.height,data};
}
export async function browserPixels(blob:Blob,cap?:number):Promise<{image:RgbaPixels;description:string}>{
 if(blob.size>16*1024*1024)throw new Error('Choose an image under 16 MiB.');
 const url=URL.createObjectURL(blob);
 try{const img=new Image();img.src=url;await img.decode();
  if(!cap&&img.naturalWidth*img.naturalHeight>4_000_000)throw new Error('Recovery supports images up to 4 million pixels. It never silently resizes them.');
  const scale=cap?Math.min(1,cap/Math.max(img.naturalWidth,img.naturalHeight)):1,width=Math.max(1,Math.round(img.naturalWidth*scale)),height=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true})!;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(img,0,0,width,height);
  return {image:{width,height,data:context.getImageData(0,0,width,height).data},description:`Original ${img.naturalWidth} × ${img.naturalHeight}; working image ${width} × ${height}${scale<1?' (reduced before embedding)':''}. Browser-decoded RGB, transparency flattened onto white.`};
 }finally{URL.revokeObjectURL(url);}
}
