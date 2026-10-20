/** CPU inspection views. These are pixel transforms, not trained detectors.
 *
 * Inputs are straight (unpremultiplied), 8-bit RGBA samples. RGB samples are used
 * as supplied, including samples under transparent pixels. Every output is a NEW
 * buffer with alpha=255. Composite transparent inputs onto the intended viewing
 * background before calling if the view should describe that visible composite.
 * Functions never change the input or resize it. Borders replicate edge pixels.
 */
export const MAX_INSPECTION_PIXELS = 4_000_000;
export const CHANNEL_VIEWS = ['rgb', 'r', 'g', 'b', 'grayscale'] as const;
export const BIT_CHANNELS = ['r', 'g', 'b'] as const;
export const DETAIL_RADII = [1, 2, 4] as const;
export const DETAIL_GAINS = [1, 4, 12] as const;
export type ChannelView = typeof CHANNEL_VIEWS[number];
export type BitChannel = typeof BIT_CHANNELS[number];
export type DetailRadius = typeof DETAIL_RADII[number];
export type DetailGain = typeof DETAIL_GAINS[number];
export type RgbaPixels = {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
};
export type InspectionOptions =
  | {kind: 'channel'; channel: ChannelView}
  | {kind: 'bit-plane'; channel: BitChannel; bit: number}
  | {kind: 'edges'}
  | {kind: 'detail'; radius: DetailRadius; gain: DetailGain};

function validateImage(image: RgbaPixels): number {
  if (!image || !(image.data instanceof Uint8ClampedArray)) {
    throw new TypeError('Expected an RGBA Uint8ClampedArray.');
  }
  const {width, height} = image;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new RangeError('Image width and height must be positive integers.');
  }
  const pixels = width * height;
  if (pixels > MAX_INSPECTION_PIXELS || image.data.length !== pixels * 4) {
    throw new RangeError(`Use exactly width × height RGBA samples, up to ${MAX_INSPECTION_PIXELS.toLocaleString('en-US')} pixels.`);
  }
  return pixels;
}

// Integer BT.601-style luma approximation on encoded RGB, not linear-light luminance.
function luma(data: Uint8ClampedArray, i: number): number {
  return Math.round((299 * data[i] + 587 * data[i + 1] + 114 * data[i + 2]) / 1000);
}
function result(image: RgbaPixels, data: Uint8ClampedArray): RgbaPixels {
  return {data, width: image.width, height: image.height};
}
function clampIndex(index: number, last: number): number {
  return index < 0 ? 0 : index > last ? last : index;
}

/** Isolate one colour with the other two set to zero, or render weighted gray. */
export function channelView(image: RgbaPixels, channel: ChannelView): RgbaPixels {
  const pixels = validateImage(image);
  if (!(CHANNEL_VIEWS as readonly unknown[]).includes(channel)) {
    throw new RangeError('Choose RGB, red, green, blue or grayscale.');
  }
  const output = new Uint8ClampedArray(pixels * 4), source = image.data;
  for (let i = 0; i < output.length; i += 4) {
    if (channel === 'grayscale') {
      const value = luma(source, i);
      output[i] = value; output[i + 1] = value; output[i + 2] = value;
    } else {
      output[i] = channel === 'rgb' || channel === 'r' ? source[i] : 0;
      output[i + 1] = channel === 'rgb' || channel === 'g' ? source[i + 1] : 0;
      output[i + 2] = channel === 'rgb' || channel === 'b' ? source[i + 2] : 0;
    }
    output[i + 3] = 255;
  }
  return result(image, output);
}

/** Bit 0 is least significant, bit 7 most significant. 0=black and 1=white. */
export function bitPlane(image: RgbaPixels, channel: BitChannel, bit: number): RgbaPixels {
  const pixels = validateImage(image);
  if (!(BIT_CHANNELS as readonly unknown[]).includes(channel)) {
    throw new RangeError('Choose a red, green or blue bit-plane channel.');
  }
  if (!Number.isInteger(bit) || bit < 0 || bit > 7) {
    throw new RangeError('Bit plane must be an integer from 0 to 7.');
  }
  const offset = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
  const output = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < output.length; i += 4) {
    const value = ((image.data[i + offset] >>> bit) & 1) * 255;
    output[i] = value; output[i + 1] = value; output[i + 2] = value; output[i + 3] = 255;
  }
  return result(image, output);
}

/** 3×3 Sobel magnitude on rounded encoded-RGB luma, with replicated borders.
 * Display value is round(min(255, hypot(Gx,Gy)/4)). A full black/white straight
 * edge reaches 255; sufficiently strong diagonal edges can saturate as well.
 */
export function sobelEdges(image: RgbaPixels): RgbaPixels {
  const pixels = validateImage(image), {width, height} = image;
  const gray = new Uint8Array(pixels), output = new Uint8ClampedArray(pixels * 4);
  for (let p = 0; p < pixels; p++) gray[p] = luma(image.data, p * 4);
  for (let y = 0; y < height; y++) {
    const above = Math.max(0, y - 1) * width, row = y * width, below = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - 1), right = Math.min(width - 1, x + 1);
      const gx = -gray[above + left] + gray[above + right]
        - 2 * gray[row + left] + 2 * gray[row + right]
        - gray[below + left] + gray[below + right];
      const gy = -gray[above + left] - 2 * gray[above + x] - gray[above + right]
        + gray[below + left] + 2 * gray[below + x] + gray[below + right];
      const value = Math.min(255, Math.round(Math.hypot(gx, gy) / 4)), i = (row + x) * 4;
      output[i] = value; output[i + 1] = value; output[i + 2] = value; output[i + 3] = 255;
    }
  }
  return result(image, output);
}

/** Absolute RGB detail residual against a square box blur, with replicated borders.
 * Radius 1/2/4 means 3×3/5×5/9×9. For each channel the display is
 * round(min(255, abs(original - unrounded blur mean) * gain)).
 * Uses exact integer running sums, O(pixels), and one 2-byte-per-pixel scratch
 * buffer. No integral-image growth or rounding between separable passes.
 */
export function highPassDetail(image: RgbaPixels, radius: DetailRadius, gain: DetailGain): RgbaPixels {
  const pixels = validateImage(image), {width, height} = image;
  if (!(DETAIL_RADII as readonly unknown[]).includes(radius)) {
    throw new RangeError('Box-blur radius must be 1, 2 or 4 pixels.');
  }
  if (!(DETAIL_GAINS as readonly unknown[]).includes(gain)) {
    throw new RangeError('Detail amplification must be 1, 4 or 12.');
  }
  const source = image.data, output = new Uint8ClampedArray(pixels * 4);
  const horizontal = new Uint16Array(pixels), diameter = 2 * radius + 1, area = diameter * diameter;
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let dx = -radius; dx <= radius; dx++) sum += source[(row + clampIndex(dx, width - 1)) * 4 + c];
      for (let x = 0; x < width; x++) {
        horizontal[row + x] = sum;
        sum += source[(row + clampIndex(x + radius + 1, width - 1)) * 4 + c]
          - source[(row + clampIndex(x - radius, width - 1)) * 4 + c];
      }
    }
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = -radius; dy <= radius; dy++) sum += horizontal[clampIndex(dy, height - 1) * width + x];
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        output[i + c] = Math.min(255, Math.round(Math.abs(source[i + c] - sum / area) * gain));
        if (c === 2) output[i + 3] = 255;
        sum += horizontal[clampIndex(y + radius + 1, height - 1) * width + x]
          - horizontal[clampIndex(y - radius, height - 1) * width + x];
      }
    }
  }
  return result(image, output);
}

/** A single dispatch entry point for a dropdown/radio-driven interface. */
export function inspectPixels(image: RgbaPixels, options: InspectionOptions): RgbaPixels {
  if (!options || typeof options !== 'object') throw new TypeError('Inspection options are required.');
  switch (options.kind) {
    case 'channel': return channelView(image, options.channel);
    case 'bit-plane': return bitPlane(image, options.channel, options.bit);
    case 'edges': return sobelEdges(image);
    case 'detail': return highPassDetail(image, options.radius, options.gain);
    default: throw new RangeError('Unknown visual inspection mode.');
  }
}
