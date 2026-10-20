// Teaching format: 16-bit magic, 16-bit UTF-8 byte length, payload, 32-bit CRC.
// Zero and one map to U+200B and U+200C. CRC detects accidental corruption, not tampering.
const MAGIC=[0x45,0x4c];
const ZERO='\u200b',ONE='\u200c';
export const MAX_MESSAGE_BYTES=512;
export function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export const toBits=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(2).padStart(8,'0')).join('');
export function encodeMessage(carrier:string,message:string){
 if(!carrier.trim()||carrier.length>12000)throw new Error('Use 1–12,000 visible cover-text characters.');
 if(/[\u200b\u200c]/u.test(carrier))throw new Error('Cover text already contains teaching-format zero-width characters. Remove them before embedding.');
 const payload=new TextEncoder().encode(message);if(!payload.length||payload.length>MAX_MESSAGE_BYTES)throw new Error(`Use 1–${MAX_MESSAGE_BYTES} UTF-8 message bytes.`);
 const bytes=new Uint8Array(4+payload.length+4);bytes.set(MAGIC);bytes[2]=payload.length>>8;bytes[3]=payload.length&255;bytes.set(payload,4);new DataView(bytes.buffer).setUint32(4+payload.length,crc32(payload));const bits=toBits(bytes);const hidden=Array.from(bits,b=>b==='0'?ZERO:ONE).join('');const first=Array.from(carrier)[0].length;
 return {stego:carrier.slice(0,first)+hidden+carrier.slice(first),payloadBits:toBits(payload),encodedBits:bits,byteCount:payload.length,hiddenCharacters:bits.length};
}
export function decodeMessage(stego:string){
 if(stego.length>30000)throw new Error('Input is too large for this exercise.');const hidden=Array.from(stego).filter(c=>c===ZERO||c===ONE);if(hidden.length<64)throw new Error('No complete teaching-format message found.');if(hidden.length%8)throw new Error('Hidden data is incomplete; characters may have been removed.');
 const bytes=new Uint8Array(hidden.length/8);for(let i=0;i<hidden.length;i++)bytes[Math.floor(i/8)]|=(hidden[i]===ONE?1:0)<<(7-i%8);
 if(bytes[0]!==MAGIC[0]||bytes[1]!==MAGIC[1])throw new Error('Hidden characters found, but the teaching-format header is missing.');const length=(bytes[2]<<8)|bytes[3];if(length<1||length>MAX_MESSAGE_BYTES||bytes.length!==length+8)throw new Error('Length check failed. The embedded message may be damaged.');
 const payload=bytes.slice(4,4+length);if(crc32(payload)!==new DataView(bytes.buffer).getUint32(length+4))throw new Error('Checksum failed. The embedded data was changed.');let message:string;try{message=new TextDecoder('utf-8',{fatal:true}).decode(payload);}catch{throw new Error('Message bytes are not valid UTF-8.');}
 return {message,byteCount:length,payloadBits:toBits(payload),carrier:stego.replace(/[\u200b\u200c]/gu,'')};
}
