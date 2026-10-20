import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANGE_HIGHLIGHT, cropPixels, highlightWatermarkChanges} from '../lib/watermark-changes.ts';
import {crc32, decodeWatermark, encodeWatermark, FRAME_HEADER_BYTES, parseWatermarkSeed, watermarkLocations, type RgbaPixels, type WatermarkOptions} from '../lib/watermark.ts';

test('seed input is an integer of at most nine decimal digits',()=>{
  for(const value of ['0','2026','999999999']) assert.equal(parseWatermarkSeed(value),Number(value));
  for(const value of ['', '-1','1.5','1e3','1000000000',' 2026','abc']) assert.throws(()=>parseWatermarkSeed(value),/Seed/);
  for(const seed of [-1,1.5,NaN,Infinity,1000000000]) assert.throws(()=>watermarkLocations(100,10,seed),/Seed/);
});

test('seeded placement is deterministic, unique, scattered and prefix-stable',()=>{
  for(const total of [3844,251502]) {
    const a=watermarkLocations(total,600,2026);
    assert.equal(new Set(a).size,600);
    assert.ok(a.every(n=>n>=0&&n<total));
    assert.deepEqual(a,watermarkLocations(total,600,2026));
    assert.deepEqual(a.slice(0,88),watermarkLocations(total,88,2026));
    assert.notDeepEqual(a,watermarkLocations(total,600,2027));
    assert.ok(Math.min(...a)<total/4 && Math.max(...a)>total*3/4);
  }
});

test('supplied photo recovers seeded Unicode from exported PNG and rejects wrong seed',async()=>{
  const {readFileSync}=await import('node:fs');
  const {exactPngPixels}=await import('../lib/watermark-files.ts');
  const {writePng}=await import('../lib/write-png.ts');
  const source=await exactPngPixels(new Uint8Array(readFileSync('public/experiments/watermark-888-500.png')));
  const original=source.data.slice();
  for(const method of ['blue-lsb','blue-dct'] as const) for(const seed of [0,2026,999999999]) {
    const options=method==='blue-lsb'?{method,seed}:{method,seed,strength:40 as const};
    const encoded=encodeWatermark(source,'Evidence 警察',options);
    assert.equal(encoded.metadata.version,2);
    assert.equal(encoded.metadata.seed,seed);
    assert.deepEqual(encoded.image.data,encodeWatermark(source,'Evidence 警察',options).image.data);
    const restored=await exactPngPixels(await writePng(encoded.image));
    assert.equal(decodeWatermark(restored,method,seed).text,'Evidence 警察');
    assert.throws(()=>decodeWatermark(restored,method,seed===2026?2027:2026),/header|CRC/);
    assert.throws(()=>decodeWatermark(restored,method),/header|version/);
    const total=method==='blue-lsb'?source.width*source.height:Math.floor(source.width/8)*Math.floor(source.height/8);
    const selected=new Set(watermarkLocations(total,encoded.metadata.embeddedBits,seed));
    for(let y=0;y<source.height;y++) for(let x=0;x<source.width;x++) {
      const i=(y*source.width+x)*4;
      assert.equal(restored.data[i],source.data[i]);
      assert.equal(restored.data[i+1],source.data[i+1]);
      if(restored.data[i+2]!==source.data[i+2]) {
        const location=method==='blue-lsb'?y*source.width+x:Math.floor(y/8)*Math.floor(source.width/8)+Math.floor(x/8);
        assert.ok(selected.has(location));
        if(method==='blue-lsb') assert.ok(Math.abs(restored.data[i+2]-source.data[i+2])<=1);
        else assert.ok(x<Math.floor(source.width/8)*8&&y<Math.floor(source.height/8)*8);
      }
    }
  }
  assert.deepEqual(source.data,original);
});

function pixels(width: number, height: number, style: 'gradient'|'random'|'black'|'white'|'photo-like' = 'gradient'): RgbaPixels {
  const data = new Uint8ClampedArray(width*height*4); let seed=123456789;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const value=style==='black'?0:style==='white'?255:style==='random'?seed>>>24:style==='photo-like'?Math.round(128+45*Math.sin(x/17)+35*Math.cos(y/23)+12*Math.sin((x+y)/3)):(x*3+y*5)%256;
    data[i]=style==='black'||style==='white'?value:(value+37)%256; data[i+1]=value; data[i+2]=value; data[i+3]=(x+y)%256;
  }
  return {data,width,height};
}
function setLsbByte(image: RgbaPixels, index: number, value: number) {
  for(let bit=0;bit<8;bit++){const i=(index*8+bit)*4+2;image.data[i]=(image.data[i]&254)|((value>>>(7-bit))&1);}
}

test('CRC32 matches the standard IEEE check vector',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  assert.equal(crc32(new Uint8Array()),0);
});

test('ASCII, Unicode, empty and maximum-length payloads round-trip in both methods',()=>{
  const src=pixels(256,256), original=src.data.slice();
  for(const text of ['Evidence Lab','警察 👮 café','', '\ufefftext', 'x'.repeat(64)]) for(const options of [{method:'blue-lsb'},{method:'blue-dct',strength:20},{method:'blue-dct',strength:40},{method:'blue-dct',strength:80}] as WatermarkOptions[]) {
    const encoded=encodeWatermark(src,text,options), decoded=decodeWatermark(encoded.image,options.method);
    assert.equal(decoded.text,text);assert.equal(decoded.payloadBytes,new TextEncoder().encode(text).length);
    assert.equal(encoded.metadata.embeddedBits,(FRAME_HEADER_BYTES+decoded.payloadBytes)*8);
    assert.equal(encoded.metadata.payloadBits,decoded.payloadBytes*8);
    assert.equal(encoded.metadata.capacityBits,options.method==='blue-lsb'?65536:1024);
    assert.ok(encoded.metadata.changes.length<=8);
    assert.ok(encoded.metadata.payloadChanges.length<=8);
    const textBytes=new TextEncoder().encode(text);
    for(const change of encoded.metadata.payloadChanges){
      const bit=change.bitIndex-FRAME_HEADER_BYTES*8;
      assert.ok(bit>=0&&bit<textBytes.length*8);
      assert.equal(change.payloadBit,(textBytes[bit>>>3]>>>(7-(bit&7)))&1);
    }
    if(text==='')assert.deepEqual(encoded.metadata.payloadChanges,[]);
    for(let i=0;i<src.data.length;i+=4){assert.equal(encoded.image.data[i],src.data[i]);assert.equal(encoded.image.data[i+1],src.data[i+1]);assert.equal(encoded.image.data[i+3],255);}
  }
  assert.deepEqual(src.data,original);
});

test('quantized DCT works on gradients, textured values, random pixels, black and white',()=>{
  for(const style of ['gradient','photo-like','random','black','white'] as const) for(const strength of [20,40,80] as const) {
    const src=pixels(193,129,style), encoded=encodeWatermark(src,'LAB ✓',{method:'blue-dct',strength});
    assert.equal(decodeWatermark(encoded.image,'blue-dct').text,'LAB ✓');
    // Incomplete right/bottom block strips are untouched in RGB, not used as capacity.
    assert.equal(encoded.metadata.capacityBits,24*16);
    for(let y=0;y<src.height;y++) for(let x=0;x<src.width;x++) if(x>=192||y>=128) assert.equal(encoded.image.data[(y*src.width+x)*4+2],src.data[(y*src.width+x)*4+2]);
  }
});

test('first reported changes correspond to actual encoded samples and coefficient signs',()=>{
  const lsb=encodeWatermark(pixels(100,20,'black'),'test',{method:'blue-lsb'});
  assert.equal(lsb.metadata.changes.length,8);
  for(const c of lsb.metadata.changes) {
    assert.equal(c.method,'blue-lsb'); if(c.method!=='blue-lsb')continue;
    assert.notEqual(c.blueBefore,c.blueAfter);assert.equal(c.bitAfter,c.payloadBit);
    assert.equal(lsb.image.data[(c.y*lsb.image.width+c.x)*4+2],c.blueAfter);
  }
  const dct=encodeWatermark(pixels(128,128,'black'),'test',{method:'blue-dct',strength:40});
  assert.equal(dct.metadata.changes.length,8);
  for(const c of dct.metadata.changes) {
    assert.equal(c.method,'blue-dct');if(c.method!=='blue-dct')continue;
    assert.ok(c.changedPixels>0);assert.equal(c.differenceAfter>=0?1:0,c.payloadBit);
    assert.ok(Math.abs((c.coefficientAAfter-c.coefficientBAfter)-c.differenceAfter)<1e-9);
  }
  assert.equal(lsb.metadata.payloadChanges.length,8);
  assert.equal(dct.metadata.payloadChanges.length,8);
});

test('lossless PNG export and strict PNG decode preserve the watermark pixels and Unicode payload',async()=>{
  // Read-only imports of the actual application PNG codec, without any site edits.
  const {writePng}=await import('../lib/write-png.ts');
  const {readPng}=await import('../lib/png-lsb.ts');
  const src=pixels(193,129,'photo-like');
  for(const options of [{method:'blue-lsb'},{method:'blue-dct',strength:20},{method:'blue-dct',strength:80}] as WatermarkOptions[]){
    const encoded=encodeWatermark(src,'警察 lab ✓',options);
    const restored=await readPng(await writePng(encoded.image));
    const data=new Uint8ClampedArray(restored.width*restored.height*4);
    for(let p=0;p<restored.width*restored.height;p++){
      for(let c=0;c<3;c++)data[p*4+c]=restored.data[p*restored.channels+c];
      data[p*4+3]=restored.channels===4?restored.data[p*4+3]:255;
    }
    const image={data,width:restored.width,height:restored.height};
    assert.deepEqual(image.data,encoded.image.data);
    assert.equal(decodeWatermark(image,options.method).text,'警察 lab ✓');
  }
});

test('actual workshop photo-sized PNG supports both watermark methods and exact exported recovery',async()=>{
  const {readFileSync}=await import('node:fs');
  const {exactPngPixels}=await import('../lib/watermark-files.ts');
  const {writePng}=await import('../lib/write-png.ts');
  const source=await exactPngPixels(new Uint8Array(readFileSync('public/experiments/watermark-888-500.png')));
  for(const options of [{method:'blue-lsb'},{method:'blue-dct',strength:40}] as WatermarkOptions[]){
    const encoded=encodeWatermark(source,'Police workshop 警察',options);
    assert.equal(decodeWatermark(await exactPngPixels(await writePng(encoded.image)),options.method).text,'Police workshop 警察');
  }
});

test('wrong method, corruption, truncated payload, unknown version/length and invalid UTF8 are rejected',()=>{
  const lsb=encodeWatermark(pixels(256,256),'hello',{method:'blue-lsb'}).image;
  assert.throws(()=>decodeWatermark(lsb,'blue-dct'),/header|method/);
  const dct=encodeWatermark(pixels(256,256),'hello',{method:'blue-dct',strength:40}).image;
  assert.throws(()=>decodeWatermark(dct,'blue-lsb'),/header|method/);
  const corrupt={...lsb,data:lsb.data.slice()};corrupt.data[(FRAME_HEADER_BYTES*8+2)*4+2]^=1;
  assert.throws(()=>decodeWatermark(corrupt,'blue-lsb'),/CRC/);
  const truncated={width:90,height:1,data:lsb.data.slice(0,90*4)};
  assert.throws(()=>decodeWatermark(truncated,'blue-lsb'),/truncated/);
  const badVersion={...lsb,data:lsb.data.slice()};setLsbByte(badVersion,4,2);
  assert.throws(()=>decodeWatermark(badVersion,'blue-lsb'),/version/);
  const badLength={...lsb,data:lsb.data.slice()};setLsbByte(badLength,6,65);
  assert.throws(()=>decodeWatermark(badLength,'blue-lsb'),/length/);
  const badMethod={...lsb,data:lsb.data.slice()};setLsbByte(badMethod,5,2);
  assert.throws(()=>decodeWatermark(badMethod,'blue-lsb'),/method/);
  const invalidUtf8={...lsb,data:lsb.data.slice()};setLsbByte(invalidUtf8,6,1);setLsbByte(invalidUtf8,FRAME_HEADER_BYTES,255);
  const crc=crc32(new Uint8Array([255]));for(let i=0;i<4;i++)setLsbByte(invalidUtf8,7+i,(crc>>>(i*8))&255);
  assert.throws(()=>decodeWatermark(invalidUtf8,'blue-lsb'),/UTF-8/);
});

test('capacity, dimensions, options, UTF8 byte length and invalid surrogates are validated',()=>{
  const src=pixels(128,128);
  for(const bad of [null,{...src,width:0},{...src,height:1.5},{...src,width:4_000_001},{...src,data:new Uint8ClampedArray(1)},{...src,data:new Uint8Array(src.data.length)}]) {
    assert.throws(()=>encodeWatermark(bad as RgbaPixels,'x',{method:'blue-lsb'}));
    assert.throws(()=>decodeWatermark(bad as RgbaPixels,'blue-lsb'));
  }
  assert.throws(()=>encodeWatermark(src,'x'.repeat(65),{method:'blue-lsb'}),/64/);
  assert.throws(()=>encodeWatermark(src,'警'.repeat(22),{method:'blue-lsb'}),/64/);
  assert.throws(()=>encodeWatermark(src,'\ud800',{method:'blue-lsb'}),/Unicode/);
  assert.throws(()=>encodeWatermark(src,12 as never,{method:'blue-lsb'}),/string/);
  assert.throws(()=>encodeWatermark(src,'x',null as never),/options/);
  assert.throws(()=>encodeWatermark(src,'x',{method:'other'} as never),/Choose/);
  for(const strength of [0,10,Infinity,NaN,undefined]) assert.throws(()=>encodeWatermark(src,'x',{method:'blue-dct',strength} as never),/strength/);
  assert.throws(()=>decodeWatermark(src,'other' as never),/Choose/);
  assert.throws(()=>encodeWatermark(pixels(10,8),'x',{method:'blue-lsb'}),/need/);
  assert.throws(()=>decodeWatermark(pixels(10,8),'blue-lsb'),/small/);
  assert.throws(()=>encodeWatermark(pixels(64,64),'x',{method:'blue-dct',strength:20}),/need/);
  assert.throws(()=>decodeWatermark(pixels(7,200),'blue-dct'),/small/);
});
test('watermark overlay counts actual RGB changes, ignores alpha, and preserves both inputs',()=>{
  const before={width:4,height:1,data:new Uint8ClampedArray([10,20,30,0, 10,20,30,255, 10,20,30,255, 10,20,30,255])};
  const after={...before,data:before.data.slice()};
  after.data[3]=255; // Alpha-only normalization must not appear as a watermark change.
  after.data[4]++;after.data[9]--;after.data[14]++;
  const original=before.data.slice(),encoded=after.data.slice();
  const result=highlightWatermarkChanges(before,after);
  assert.equal(result.changedPixels,3);
  assert.deepEqual(result.firstChanged,{x:1,y:0,blueBefore:30,blueAfter:30});
  assert.deepEqual(result.image.data.slice(0,4),after.data.slice(0,4));
  for(let p=1;p<4;p++)assert.deepEqual(Array.from(result.image.data.slice(p*4,p*4+4)),[...CHANGE_HIGHLIGHT,255]);
  assert.deepEqual(before.data,original);assert.deepEqual(after.data,encoded);
  assert.throws(()=>highlightWatermarkChanges(before,{...after,width:2,height:2}),/matching/);
});

test('close-up crops retain exact pixels at image edges and no-change images have no focus',()=>{
  for(const [width,height,x,y,expected] of [
    [32,24,0,0,{x:0,y:0,width:16,height:16}],
    [32,24,31,23,{x:16,y:8,width:16,height:16}],
    [3,2,2,1,{x:0,y:0,width:3,height:2}],
  ] as const){
    const before=pixels(width,height),after={...before,data:before.data.slice()};
    after.data[(y*width+x)*4+2]^=1;
    const {image,region,firstChanged}=highlightWatermarkChanges(before,after);
    assert.deepEqual(region,expected);assert.equal(firstChanged?.x,x);assert.equal(firstChanged?.y,y);
    const crop=cropPixels(image,region!);
    for(let cy=0;cy<crop.height;cy++)for(let cx=0;cx<crop.width;cx++){
      const originalOffset=((expected.y+cy)*width+expected.x+cx)*4,offset=(cy*crop.width+cx)*4;
      assert.deepEqual(crop.data.slice(offset,offset+4),image.data.slice(originalOffset,originalOffset+4));
    }
  }
  const before=pixels(100,20),once=encodeWatermark(before,'same',{method:'blue-lsb'}).image;
  const twice=encodeWatermark(once,'same',{method:'blue-lsb'}).image;
  const result=highlightWatermarkChanges(once,twice);
  assert.equal(result.changedPixels,0);assert.equal(result.firstChanged,null);assert.equal(result.region,null);
  assert.deepEqual(result.image.data,twice.data);
});

test('LSB and DCT overlays cover every actual changed pixel, including changes beyond the metadata sample',()=>{
  const before=pixels(193,129,'photo-like');
  for(const options of [{method:'blue-lsb'},{method:'blue-dct',strength:40}] as WatermarkOptions[]){
    const encoded=encodeWatermark(before,'Evidence Lab',options),result=highlightWatermarkChanges(before,encoded.image);
    let expected=0;
    for(let p=0;p<before.width*before.height;p++){
      const i=p*4,changed=before.data[i]!==encoded.image.data[i]||before.data[i+1]!==encoded.image.data[i+1]||before.data[i+2]!==encoded.image.data[i+2];
      if(changed)expected++;
      assert.deepEqual(Array.from(result.image.data.slice(i,i+4)),changed?[...CHANGE_HIGHLIGHT,255]:Array.from(encoded.image.data.slice(i,i+4)));
      if(options.method==='blue-dct'&&(p%before.width>=192||Math.floor(p/before.width)>=128))assert.equal(changed,false);
    }
    assert.equal(result.changedPixels,expected);assert.ok(expected>encoded.metadata.changes.length);
  }
});

test('generating the highlight and close-up cannot change the exported PNG or recovered message',async()=>{
  const {writePng}=await import('../lib/write-png.ts');
  const {exactPngPixels}=await import('../lib/watermark-files.ts');
  const before=pixels(193,129,'photo-like');
  for(const options of [{method:'blue-lsb'},{method:'blue-dct',strength:40}] as WatermarkOptions[]){
    const encoded=encodeWatermark(before,'Evidence Lab',options),png=await writePng(encoded.image);
    const result=highlightWatermarkChanges(before,encoded.image);
    assert.ok(result.region);
    cropPixels(result.image,result.region);cropPixels(encoded.image,result.region);
    assert.deepEqual(await writePng(encoded.image),png);
    assert.equal(decodeWatermark(await exactPngPixels(png),options.method).text,'Evidence Lab');
  }
});
