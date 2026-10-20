'use client';

import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Switch} from '@/components/ui/switch';
import {cropPixels, highlightWatermarkChanges} from '@/lib/watermark-changes';
import type {RgbaPixels} from '@/lib/watermark';

function ChangeCanvas({image, label, closeUp = false}: {image: RgbaPixels; label: string; closeUp?: boolean}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  }, [image]);
  return <canvas ref={ref} width={image.width} height={image.height} role="img" aria-label={label}
    className={closeUp ? 'watermark-pixel-closeup' : undefined}/>;
}

export function WatermarkChangeView({before, after}: {before: RgbaPixels; after: RgbaPixels}) {
  const [highlight, setHighlight] = useState(true);
  const toggleId = useId(), helpId = useId();
  const comparison = useMemo(() => highlightWatermarkChanges(before, after), [before, after]);
  const displayed = highlight ? comparison.image : after;
  const closeUp = useMemo(() => comparison.region ? cropPixels(displayed, comparison.region) : null, [displayed, comparison.region]);
  const {changedPixels, firstChanged, region} = comparison;

  return <div className="watermark-change-view">
    <ChangeCanvas image={displayed} label={highlight ? 'Watermarked image with actual changed pixels highlighted in pink' : 'Watermarked image without highlighting'}/>
    <div className="watermark-highlight-control">
      <Switch id={toggleId} checked={highlight} onCheckedChange={setHighlight} aria-describedby={helpId}/>
      <label htmlFor={toggleId}>Highlight changed pixels</label>
      <span className="watermark-highlight-key" aria-hidden="true"/>
    </div>
    <p className="small"><strong>{changedPixels.toLocaleString()} changed pixels</strong> out of {(after.width * after.height).toLocaleString()}. Counts include the header and message.</p>
    <p id={helpId} className="small muted">Pink marks where pixel values changed, regardless of how small the change was. This overlay is only for viewing; the saved PNG and recovery use the actual watermarked image.</p>
    {closeUp && firstChanged && region ? <div className="watermark-closeup">
      <p className="small"><strong>Close-up · {region.width} × {region.height} image pixels</strong></p>
      <ChangeCanvas image={closeUp} closeUp label={`Magnified region from pixel (${region.x}, ${region.y}), ${highlight ? 'with changed pixels highlighted in pink' : 'without highlighting'}`}/>
      <p className="small">First changed pixel ({firstChanged.x}, {firstChanged.y}): blue <strong>{firstChanged.blueBefore} → {firstChanged.blueAfter}</strong>. Coordinates start at zero.</p>
    </div> : <p className="small muted">These values already matched; no RGB changes were needed.</p>}
  </div>;
}
