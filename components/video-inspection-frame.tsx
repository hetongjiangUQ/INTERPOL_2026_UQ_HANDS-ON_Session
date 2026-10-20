'use client';
import {useEffect} from 'react';
import {inspectionFrameTime} from '@/lib/video-inspection-frame';

export type InspectionFrame = {url: string; time: number};
/** Separate decoder: extracting the still must not seek or interrupt the player. */
export function VideoInspectionFrame({src, exerciseId, onFrame, onError}: {
  src: string; exerciseId: string;
  onFrame: (frame: InspectionFrame | null) => void;
  onError: (error: string) => void;
}) {
  useEffect(() => {
    let cancelled = false, url = '', captured = false;
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    onFrame(null); onError('');
    const fail = () => { if (!cancelled) onError('Could not prepare the inspection frame. Reload this quiz to retry.'); };
    const timeout = window.setTimeout(fail, 30000);
    const capture = () => {
      if (cancelled || captured || video.readyState < 2 || !video.videoWidth) return;
      captured = true;
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        const time = video.currentTime;
        canvas.toBlob(blob => {
          if (cancelled) return;
          if (!blob) { fail(); return; }
          url = URL.createObjectURL(blob);
          window.clearTimeout(timeout);
          onError('');
          onFrame({url, time});
        }, 'image/png');
      } catch { fail(); }
    };
    video.onloadedmetadata = () => {
      try {
        const target = inspectionFrameTime(exerciseId, video.duration);
        if (target === 0) { video.onloadeddata = capture; capture(); }
        else video.currentTime = target;
      } catch { fail(); }
    };
    video.onseeked = capture;
    video.onerror = fail;
    video.src = src;
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      video.onloadedmetadata = null; video.onloadeddata = null;
      video.onseeked = null; video.onerror = null;
      video.pause(); video.removeAttribute('src'); video.load();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, exerciseId, onFrame, onError]);
  return null;
}
