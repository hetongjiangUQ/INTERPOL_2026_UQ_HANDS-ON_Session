import type {RgbaPixels} from './watermark';

export const CHANGE_HIGHLIGHT = [255, 0, 170] as const;
export type PixelRegion = {x: number; y: number; width: number; height: number};

/** Compare actual RGB samples, including the header, without changing either image. */
export function highlightWatermarkChanges(before: RgbaPixels, after: RgbaPixels) {
  if (before.width !== after.width || before.height !== after.height ||
      before.data.length !== before.width * before.height * 4 ||
      after.data.length !== before.data.length) {
    throw new Error('Watermark comparison needs matching image dimensions.');
  }
  const data = after.data.slice();
  let changedPixels = 0;
  let firstChanged: {x: number; y: number; blueBefore: number; blueAfter: number} | null = null;
  for (let i = 0; i < data.length; i += 4) {
    // Alpha normalization is not a watermark edit.
    if (before.data[i] === after.data[i] && before.data[i + 1] === after.data[i + 1] &&
        before.data[i + 2] === after.data[i + 2]) continue;
    changedPixels++;
    if (!firstChanged) {
      const pixel = i / 4;
      firstChanged = {x: pixel % after.width, y: Math.floor(pixel / after.width),
        blueBefore: before.data[i + 2], blueAfter: after.data[i + 2]};
    }
    data.set(CHANGE_HIGHLIGHT, i);
  }
  let region: PixelRegion | null = null;
  if (firstChanged) {
    const width = Math.min(16, after.width), height = Math.min(16, after.height);
    region = {
      x: Math.max(0, Math.min(after.width - width, firstChanged.x - Math.floor(width / 2))),
      y: Math.max(0, Math.min(after.height - height, firstChanged.y - Math.floor(height / 2))),
      width, height,
    };
  }
  return {image: {width: after.width, height: after.height, data}, changedPixels, firstChanged, region};
}

export function cropPixels(image: RgbaPixels, region: PixelRegion): RgbaPixels {
  const data = new Uint8ClampedArray(region.width * region.height * 4);
  for (let y = 0; y < region.height; y++) {
    const start = ((region.y + y) * image.width + region.x) * 4;
    data.set(image.data.subarray(start, start + region.width * 4), y * region.width * 4);
  }
  return {width: region.width, height: region.height, data};
}
