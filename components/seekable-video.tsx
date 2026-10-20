'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
  type SyntheticEvent,
  type VideoHTMLAttributes,
} from 'react';
import {
  clampVideoTime,
  finiteVideoDuration,
  formatVideoTime,
} from '@/lib/video-seek';

type SeekableVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  'children'
> & {
  seekLabel?: string;
};

export const SeekableVideo = forwardRef<HTMLVideoElement, SeekableVideoProps>(
  function SeekableVideo(
    {
      onDurationChange,
      onEnded,
      onLoadedMetadata,
      onTimeUpdate,
      seekLabel = 'Video position',
      src,
      ...videoProps
    },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const dragging = useRef(false);
    const inputId = useId();
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [playbackSrc, setPlaybackSrc] =
      useState<VideoHTMLAttributes<HTMLVideoElement>['src']>();

    const assignRef = useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as MutableRefObject<HTMLVideoElement | null>).current =
            node;
      },
      [forwardedRef],
    );

    useEffect(() => {
      dragging.current = false;
      setDuration(0);
      setPosition(0);
      setPlaybackSrc(undefined);

      if (!src) return;

      if (typeof src !== 'string') {
        setPlaybackSrc(src);
        return;
      }

      let objectUrl: string | undefined;
      let stopped = false;
      const controller = new AbortController();
      const sourceUrl = new URL(src, window.location.href);

      if (
        sourceUrl.origin !== window.location.origin ||
        sourceUrl.protocol === 'blob:'
      ) {
        setPlaybackSrc(src);
        return;
      }

      void fetch(sourceUrl, {
        credentials: 'same-origin',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.status === 206) {
            await response.body?.cancel();
            if (!stopped) setPlaybackSrc(src);
            return;
          }

          if (
            response.status === 200 &&
            response.headers.get('content-type')?.startsWith('video/')
          ) {
            const blob = await response.blob();
            if (stopped) return;
            objectUrl = URL.createObjectURL(blob);
            setPlaybackSrc(objectUrl);
            return;
          }

          await response.body?.cancel();
          if (!stopped) setPlaybackSrc(src);
        })
        .catch((error: unknown) => {
          if (
            !stopped &&
            !(error instanceof DOMException && error.name === 'AbortError')
          )
            setPlaybackSrc(src);
        });

      return () => {
        stopped = true;
        controller.abort();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [src]);

    function readDuration(event: SyntheticEvent<HTMLVideoElement>) {
      const nextDuration = finiteVideoDuration(event.currentTarget.duration);
      setDuration(nextDuration);
      setPosition((current) => Math.min(current, nextDuration));
    }

    function seek(next: number) {
      const video = videoRef.current;
      if (!video) return;
      const maximum = finiteVideoDuration(video.duration);
      if (!maximum) return;
      const bounded = clampVideoTime(next, maximum);
      video.currentTime = bounded;
      setPosition(bounded);
    }

    const sliderValue = Math.min(position, duration || 0);
    return (
      <div className="seekable-video">
        <video
          {...videoProps}
          ref={assignRef}
          src={playbackSrc}
          onLoadedMetadata={(event) => {
            readDuration(event);
            onLoadedMetadata?.(event);
          }}
          onDurationChange={(event) => {
            readDuration(event);
            onDurationChange?.(event);
          }}
          onTimeUpdate={(event) => {
            if (!dragging.current) setPosition(event.currentTarget.currentTime);
            onTimeUpdate?.(event);
          }}
          onEnded={(event) => {
            setPosition(finiteVideoDuration(event.currentTarget.duration));
            onEnded?.(event);
          }}
        />
        <div className="video-seek-control">
          <label htmlFor={inputId}>{seekLabel}</label>
          <input
            id={inputId}
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={sliderValue}
            disabled={!duration}
            aria-valuetext={`${formatVideoTime(sliderValue)} of ${formatVideoTime(duration)}`}
            onPointerDown={() => {
              dragging.current = true;
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
            onBlur={() => {
              dragging.current = false;
            }}
            onChange={(event) => seek(Number(event.currentTarget.value))}
          />
          <output htmlFor={inputId} aria-live="off">
            {formatVideoTime(sliderValue)} / {formatVideoTime(duration)}
          </output>
        </div>
      </div>
    );
  },
);
