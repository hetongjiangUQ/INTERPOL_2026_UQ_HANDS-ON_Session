/** Two toy text-watermark formats for teaching. Not authentication or attribution.
 * No dependencies, networking, input mutation, or GPU. Process straight 8-bit RGBA.
 * Encoded output is opaque; RGB under input transparency is used as supplied.
 */
export const MAX_WATERMARK_PIXELS = 4_000_000;
export const MAX_TEXT_BYTES = 64;
export const FRAME_HEADER_BYTES = 11;
export const DCT_STRENGTHS = [20, 40, 80] as const;
export type WatermarkMethod = 'blue-lsb' | 'blue-dct';
export type DctStrength = typeof DCT_STRENGTHS[number];
export type RgbaPixels = {readonly data: Uint8ClampedArray; readonly width: number; readonly height: number};
export type WatermarkOptions = ({method: 'blue-lsb'} | {method: 'blue-dct'; strength: DctStrength}) & {seed?: number};
export type LsbChange = {method: 'blue-lsb'; bitIndex: number; x: number; y: number; payloadBit: number; blueBefore: number; blueAfter: number; bitBefore: number; bitAfter: number};
export type DctChange = {method: 'blue-dct'; bitIndex: number; blockX: number; blockY: number; payloadBit: number; coefficientABefore: number; coefficientBBefore: number; differenceBefore: number; coefficientAAfter: number; coefficientBAfter: number; differenceAfter: number; requestedDifference: number; changedPixels: number};
export type WatermarkMetadata = {method: WatermarkMethod; version: 1 | 2; seed?: number; payloadBytes: number; payloadBits: number; frameBytes: number; embeddedBits: number; capacityBits: number; capacityTextBytes: number; crc32: string; strength?: DctStrength; changes: (LsbChange | DctChange)[]; payloadChanges: (LsbChange | DctChange)[]};
export type EncodedWatermark = {image: RgbaPixels; metadata: WatermarkMetadata};
export type DecodedWatermark = {text: string; method: WatermarkMethod; version: 1 | 2; seed?: number; payloadBytes: number; payloadBits: number; frameBytes: number; embeddedBits: number; capacityBits: number; crc32: string};


export const DEFAULT_WATERMARK_SEED = 2026;
export function parseWatermarkSeed(value: string): number {
  if (!/^[0-9]{1,9}$/.test(value)) throw new Error('Seed must contain 1–9 digits (0–999999999).');
  return Number(value);
}
function validateSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 999999999) throw new Error('Seed must be an integer from 0 to 999999999.');
}
/** Partial Fisher–Yates shuffle: unique, reproducible scattered locations.
 * Mulberry32 is a teaching PRNG, not cryptography. Undefined retains legacy v1.
 * Only up to 600 locations are needed; the sparse swap map avoids a full-image shuffle.
 */
export function watermarkLocations(total: number, count: number, seed?: number): number[] {
  if (seed === undefined) return Array.from({length: count}, (_, i) => i);
  validateSeed(seed);
  let state = seed >>> 0;
  const swaps = new Map<number, number>(), locations: number[] = [];
  for (let i = 0; i < count; i++) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const random = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = i + Math.floor(random * (total - i));
    locations.push(swaps.get(j) ?? j);
    swaps.set(j, swaps.get(i) ?? i);
  }
  return locations;
}

const MAGIC = [0x45, 0x4c, 0x57, 0x4d]; // ELWM (Evidence Lab WaterMark)
const METHOD_ID: Record<WatermarkMethod, number> = {'blue-lsb': 1, 'blue-dct': 2};
const VERSION = 1;
// Orthonormal 8x8 DCT basis. x is horizontal, y vertical; A=(u2,v3), B=(u3,v2).
const BASIS_A = new Float64Array(64), BASIS_B = new Float64Array(64);
for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
  BASIS_A[y * 8 + x] = .25 * Math.cos((2*x+1)*2*Math.PI/16) * Math.cos((2*y+1)*3*Math.PI/16);
  BASIS_B[y * 8 + x] = .25 * Math.cos((2*x+1)*3*Math.PI/16) * Math.cos((2*y+1)*2*Math.PI/16);
}

function validateImage(image: RgbaPixels): void {
  if (!image || !(image.data instanceof Uint8ClampedArray)) throw new TypeError('Expected straight RGBA Uint8ClampedArray pixels.');
  if (!Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width < 1 || image.height < 1) throw new RangeError('Image dimensions must be positive integers.');
  if (image.width * image.height > MAX_WATERMARK_PIXELS || image.data.length !== image.width * image.height * 4) throw new RangeError('Use an exact RGBA buffer of at most 4 million pixels.');
}
function validateMethod(method: WatermarkMethod): void {
  if (method !== 'blue-lsb' && method !== 'blue-dct') throw new RangeError('Choose Blue LSB or the teaching DCT method.');
}
function capacity(image: RgbaPixels, method: WatermarkMethod): number {
  return method === 'blue-lsb' ? image.width * image.height : Math.floor(image.width/8) * Math.floor(image.height/8);
}

/** Standard IEEE CRC-32, for accidental-error detection only; not a signature. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function hexCrc(crc: number): string { return crc.toString(16).padStart(8, '0'); }
function frame(text: string, method: WatermarkMethod, seed?: number): {bytes: Uint8Array; payload: Uint8Array; crc: number} {
  if (typeof text !== 'string') throw new TypeError('Watermark text must be a string.');
  if (text.length > MAX_TEXT_BYTES) throw new RangeError('Use no more than 64 UTF-8 bytes of text.');
  const payload = new TextEncoder().encode(text);
  if (payload.length > MAX_TEXT_BYTES) throw new RangeError('Use no more than 64 UTF-8 bytes of text.');
  // TextEncoder replaces unpaired surrogates. Reject rather than silently change text.
  if (new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(payload) !== text) throw new RangeError('Text contains an invalid Unicode surrogate.');
  const bytes = new Uint8Array(FRAME_HEADER_BYTES + payload.length), crc = crc32(payload);
  bytes.set(MAGIC); bytes[4] = seed === undefined ? VERSION : 2; bytes[5] = METHOD_ID[method]; bytes[6] = payload.length;
  for (let i = 0; i < 4; i++) bytes[7+i] = (crc >>> (i*8)) & 255;
  bytes.set(payload, FRAME_HEADER_BYTES);
  return {bytes, payload, crc};
}
function coefficients(image: RgbaPixels, block: number): [number, number] {
  const columns = Math.floor(image.width/8), blockX = (block % columns)*8, blockY = Math.floor(block/columns)*8;
  let a = 0, b = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const value = image.data[((blockY+y)*image.width+blockX+x)*4+2] - 128, j = y*8+x;
    a += value * BASIS_A[j]; b += value * BASIS_B[j];
  }
  return [a, b];
}
function readBit(image: RgbaPixels, method: WatermarkMethod, index: number): number {
  if (method === 'blue-lsb') return image.data[index*4+2] & 1;
  const [a, b] = coefficients(image, index);
  return a-b >= 0 ? 1 : 0;
}
function readBytes(image: RgbaPixels, method: WatermarkMethod, startByte: number, length: number, locations: number[]): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) for (let bit = 0; bit < 8; bit++) bytes[i] = (bytes[i] << 1) | readBit(image, method, locations[(startByte+i)*8+bit]);
  return bytes;
}

/** Recover only this selected teaching format. No original image or strength needed. */
export function decodeWatermark(image: RgbaPixels, method: WatermarkMethod, seed?: number): DecodedWatermark {
  validateImage(image); validateMethod(method);
  const capacityBits = capacity(image, method);
  if (capacityBits < FRAME_HEADER_BYTES*8) throw new RangeError('Image is too small for this method’s watermark header.');
  const locations = watermarkLocations(capacityBits, Math.min(capacityBits, (FRAME_HEADER_BYTES + MAX_TEXT_BYTES)*8), seed);
  const header = readBytes(image, method, 0, FRAME_HEADER_BYTES, locations);
  if (!MAGIC.every((value, i) => header[i] === value)) throw new Error('No valid teaching watermark header. Check the seed and selected method, or use the original lossless PNG.');
  if (header[4] !== (seed === undefined ? VERSION : 2)) throw new Error('Unsupported teaching-watermark version.');
  if (header[5] !== METHOD_ID[method]) throw new Error('Watermark method does not match the selected decoder.');
  const length = header[6];
  if (length > MAX_TEXT_BYTES) throw new Error('Unsupported watermark payload length; maximum is 64 UTF-8 bytes.');
  const frameBytes = FRAME_HEADER_BYTES + length, embeddedBits = frameBytes*8;
  if (embeddedBits > capacityBits) throw new Error('Watermark payload is truncated or the image has been cropped.');
  const payload = readBytes(image, method, FRAME_HEADER_BYTES, length, locations);
  const expectedCrc = (header[7] | (header[8]<<8) | (header[9]<<16) | (header[10]<<24)) >>> 0;
  if (crc32(payload) !== expectedCrc) throw new Error('Watermark CRC check failed. The pixels or payload have changed.');
  let text: string;
  try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(payload); }
  catch { throw new Error('Watermark payload is not valid UTF-8 text.'); }
  return {text, method, version: seed === undefined ? 1 : 2, ...(seed === undefined ? {} : {seed}), payloadBytes: length, payloadBits: length*8, frameBytes, embeddedBits, capacityBits, crc32: hexCrc(expectedCrc)};
}

/** Return fresh opaque pixels after embedding and verifying a complete round trip.
 * Only the selected frameBytes*8 pixels/blocks are inspected or modified for the
 * watermark. DCT updates only the two basis coefficients then quantizes to bytes.
 * Quantization/clipping can reduce the requested margin; actual changes are reported.
 */
export function encodeWatermark(image: RgbaPixels, text: string, options: WatermarkOptions): EncodedWatermark {
  validateImage(image);
  if (!options || typeof options !== 'object') throw new TypeError('Watermark options are required.');
  validateMethod(options.method);
  if (options.method === 'blue-dct' && !(DCT_STRENGTHS as readonly unknown[]).includes(options.strength)) throw new RangeError('DCT strength must be 20, 40 or 80.');
  const seed = options.seed;
  if (seed !== undefined) validateSeed(seed);
  const method = options.method, packed = frame(text, method, seed), embeddedBits = packed.bytes.length*8, capacityBits = capacity(image, method);
  if (embeddedBits > capacityBits) throw new RangeError(`Text and header need ${embeddedBits} bits; this image provides ${capacityBits} bits for ${method}. Use a larger image or shorter text.`);
  const locations = watermarkLocations(capacityBits, embeddedBits, seed);
  const output: RgbaPixels = {data: image.data.slice(), width: image.width, height: image.height};
  for (let i = 3; i < output.data.length; i += 4) output.data[i] = 255;
  const changes: (LsbChange | DctChange)[] = [];
  const payloadChanges: (LsbChange | DctChange)[] = [];
  function record(change: LsbChange | DctChange) {
    if (changes.length < 8) changes.push(change);
    if (change.bitIndex >= FRAME_HEADER_BYTES*8 && payloadChanges.length < 8) payloadChanges.push(change);
  }
  for (let index = 0; index < embeddedBits; index++) {
    const location = locations[index];
    const bit = (packed.bytes[index >>> 3] >>> (7-(index & 7))) & 1;
    if (method === 'blue-lsb') {
      const i = location*4+2, before = output.data[i], after = (before & 254) | bit;
      output.data[i] = after;
      if (before !== after && (changes.length < 8 || (index >= FRAME_HEADER_BYTES*8 && payloadChanges.length < 8))) record({method, bitIndex: index, x: location % image.width, y: Math.floor(location/image.width), payloadBit: bit, blueBefore: before, blueAfter: after, bitBefore: before & 1, bitAfter: after & 1});
    } else {
      const strength = (options as {method: 'blue-dct'; strength: DctStrength}).strength;
      const columns = Math.floor(image.width/8), blockX = (location % columns)*8, blockY = Math.floor(location/columns)*8;
      const [a, b] = coefficients(output, location), difference = a-b, requestedDifference = (bit ? 1 : -1)*strength;
      // Already has at least the requested signed margin: preserve these samples.
      if ((bit ? difference : -difference) >= strength) continue;
      const originalBlock = new Uint8Array(64);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        originalBlock[y*8+x] = output.data[((blockY+y)*image.width+blockX+x)*4+2];
      }
      // Quantization and clipping break exact inverse-DCT coefficient updates.
      // At most four refinements target the SAME requested margin; the selected
      // strength is never secretly increased. Final full-frame decoding still
      // must succeed before any output is returned.
      let currentDifference = difference;
      for (let attempt = 0; attempt < 4; attempt++) {
        const delta = (requestedDifference-currentDifference)/2;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const j = y*8+x, i = ((blockY+y)*image.width+blockX+x)*4+2;
          output.data[i] = Math.max(0, Math.min(255, Math.round(output.data[i]+delta*(BASIS_A[j]-BASIS_B[j]))));
        }
        const [currentA,currentB] = coefficients(output,location);
        currentDifference = currentA-currentB;
        if ((bit ? currentDifference : -currentDifference) >= strength*.9) break;
      }
      let changedPixels = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (originalBlock[y*8+x] !== output.data[((blockY+y)*image.width+blockX+x)*4+2]) changedPixels++;
      if (changedPixels && (changes.length < 8 || (index >= FRAME_HEADER_BYTES*8 && payloadChanges.length < 8))) {
        const [afterA, afterB] = coefficients(output, location);
        record({method, bitIndex: index, blockX, blockY, payloadBit: bit, coefficientABefore: a, coefficientBBefore: b, differenceBefore: difference, coefficientAAfter: afterA, coefficientBAfter: afterB, differenceAfter: afterA-afterB, requestedDifference, changedPixels});
      }
    }
  }
  try {
    if (decodeWatermark(output, method, seed).text !== text) throw new Error('Recovered text differs.');
  } catch (error) {
    if (method === 'blue-dct') throw new Error('DCT round-trip verification failed after rounding/clipping. Try a stronger DCT setting or another source image. No encoded image was returned.');
    throw new Error(`LSB round-trip verification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
  return {image: output, metadata: {method, version: seed === undefined ? 1 : 2, ...(seed === undefined ? {} : {seed}), payloadBytes: packed.payload.length, payloadBits: packed.payload.length*8, frameBytes: packed.bytes.length, embeddedBits, capacityBits, capacityTextBytes: Math.max(0, Math.min(MAX_TEXT_BYTES, Math.floor(capacityBits/8)-FRAME_HEADER_BYTES)), crc32: hexCrc(packed.crc), ...(options.method === 'blue-dct' ? {strength: options.strength} : {}), changes, payloadChanges}};
}
