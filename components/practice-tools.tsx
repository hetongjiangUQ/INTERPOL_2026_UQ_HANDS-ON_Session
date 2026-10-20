'use client';
import { useEffect, useRef, useState } from 'react';
import type { Exercise, ToolId } from '@/lib/domain';
import { SeekableVideo } from './seekable-video';
export const isGuidedTool = (id: string) =>
  ['crop', 'compression', 'timeline', 'speed'].includes(id);
export function PracticeTool({
  tool,
  exercise: e,
}: {
  tool: ToolId;
  exercise: Exercise;
}) {
  return tool === 'speed' ? (
    <SpeedPractice mediaUrl={e.mediaUrl} />
  ) : tool === 'timeline' ? (
    <TimelinePractice mediaUrl={e.mediaUrl} />
  ) : (
    <ImagePractice mediaUrl={e.mediaUrl} crop={tool === 'crop'} />
  );
}
function SpeedPractice({ mediaUrl }: { mediaUrl: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1),
    [error, setError] = useState('');
  function speed(value: number) {
    if (video.current) video.current.playbackRate = value;
    setRate(value);
  }
  async function replay() {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    try {
      await v.play();
      setError('');
    } catch {
      setError('Use the video play control to start playback.');
    }
  }
  return (
    <section className="guided-tool">
      <p>
        Watch once at normal speed. Replay the same clip slowly and compare your
        impression.
      </p>
      <SeekableVideo
        ref={video}
        className="guided-image"
        src={mediaUrl}
        controls
        playsInline
        preload="metadata"
        seekLabel="Guided video position"
        onRateChange={() => setRate(video.current?.playbackRate ?? 1)}
        onError={() =>
          setError(
            'The video could not load. Ask your instructor to check the file.',
          )
        }
      />
      <div className="actions">
        <button
          className={rate === 1 ? 'secondary selected' : 'secondary'}
          aria-pressed={rate === 1}
          onClick={() => speed(1)}
        >
          Normal speed
        </button>
        <button
          className={rate === 0.25 ? 'secondary selected' : 'secondary'}
          aria-pressed={rate === 0.25}
          onClick={() => speed(0.25)}
        >
          Quarter speed
        </button>
        <button className="secondary" onClick={replay}>
          Replay from the start
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="small muted">
        Playback speed changes your view of the same frames. It does not run a
        detector or change the source recording.
      </p>
    </section>
  );
}
function ImagePractice({
  mediaUrl,
  crop,
}: {
  mediaUrl: string;
  crop: boolean;
}) {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [revealed, setRevealed] = useState(false),
    [variant, setVariant] = useState<'jpeg' | 'small'>('jpeg');
  const [views, setViews] = useState<{
    reference: string;
    changed: string;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    setSource(null);
    setViews(null);
    setError('');
    setRevealed(false);
    img.src = mediaUrl;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const scale = Math.min(
          1,
          768 / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas is unavailable in this browser.');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        setSource(c);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Could not load this image. Try again or ask your instructor to replace it.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [mediaUrl, retry]);
  useEffect(() => {
    if (!source) return;
    try {
      const c = document.createElement('canvas'),
        w = source.width,
        h = source.height;
      c.width = crop
        ? Math.max(1, Math.floor(w / 2))
        : variant === 'small'
          ? Math.max(1, Math.round(w / 4))
          : w;
      c.height = crop
        ? Math.max(1, Math.floor(h / 2))
        : variant === 'small'
          ? Math.max(1, Math.round(h / 4))
          : h;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error();
      if (crop)
        ctx.drawImage(
          source,
          Math.floor((w - c.width) / 2),
          Math.floor((h - c.height) / 2),
          c.width,
          c.height,
          0,
          0,
          c.width,
          c.height,
        );
      else ctx.drawImage(source, 0, 0, c.width, c.height);
      setViews({
        reference: source.toDataURL('image/png'),
        changed: c.toDataURL(
          !crop && variant === 'jpeg' ? 'image/jpeg' : 'image/png',
          0.15,
        ),
        width: c.width,
        height: c.height,
      });
    } catch {
      setError('This browser could not prepare the comparison. Please retry.');
    }
  }, [source, crop, variant]);
  if (error)
    return (
      <p className="error" role="alert">
        {error}{' '}
        <button className="secondary" onClick={() => setRetry((x) => x + 1)}>
          Retry
        </button>
      </p>
    );
  if (!source || !views)
    return <p role="status">Preparing a small preview in your browser…</p>;
  return (
    <section className="guided-tool">
      {crop ? (
        <>
          <p className="eyebrow">1 · LOOK AT THE CROP</p>
          <p>
            What can you establish from this view? Decide before revealing the
            surroundings.
          </p>
          <figure className="guided-crop">
            <img
              src={views.changed}
              alt="Central crop: surrounding context is hidden"
            />
            <figcaption>
              Central half of the width and height; one quarter of the image
              area.
            </figcaption>
          </figure>
          <button
            className="primary"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
          >
            {revealed ? 'Hide the full image' : '2 · Reveal the full image'}
          </button>
          {revealed && (
            <div className="debrief">
              <figure>
                <img
                  className="guided-image"
                  src={views.reference}
                  alt="Full image, including the context outside the crop"
                />
                <figcaption>Full view</figcaption>
              </figure>
              <p>
                <strong>What changed your interpretation?</strong> A crop can
                leave out important context. The wider view is more evidence; it
                still does not prove the scene is true.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <p>
            Compare the same image after an ordinary processing step. Look at
            small text, edges and fine lines.
          </p>
          <div className="actions">
            <button
              className={
                variant === 'jpeg' ? 'secondary selected' : 'secondary'
              }
              aria-pressed={variant === 'jpeg'}
              onClick={() => setVariant('jpeg')}
            >
              Low-quality JPEG
            </button>
            <button
              className={
                variant === 'small' ? 'secondary selected' : 'secondary'
              }
              aria-pressed={variant === 'small'}
              onClick={() => setVariant('small')}
            >
              Reduce dimensions to ¼
            </button>
          </div>
          <div className="guided-comparison">
            <figure>
              <img
                src={views.reference}
                alt="Reference preview before the selected processing step"
              />
              <figcaption>Reference preview</figcaption>
            </figure>
            <figure>
              <img
                src={views.changed}
                alt={
                  variant === 'jpeg'
                    ? 'The same preview encoded as low-quality JPEG'
                    : 'The same preview with each dimension reduced to a quarter'
                }
              />
              <figcaption>
                {variant === 'jpeg'
                  ? 'JPEG quality setting: 15%'
                  : `Smaller copy: ${views.width} × ${views.height}`}
              </figcaption>
            </figure>
          </div>
          <p className="notice">
            <strong>Which details changed?</strong> Blur, blocks and lost detail
            can result from ordinary processing. Their presence does not
            identify an AI-generated image.
          </p>
          <p className="small muted">
            Both views use the same framing and display size. JPEG quality is an
            encoder setting, not a measured quality or authenticity score.
            Browser encoders can differ.
          </p>
        </>
      )}
      <p className="small muted">
        Working preview: {source.width} × {source.height}, at most 768 pixels on
        the longest side. Transparent areas use a white background. All
        processing stays in this browser.
      </p>
    </section>
  );
}
function TimelinePractice({ mediaUrl }: { mediaUrl: string }) {
  const video = useRef<HTMLVideoElement>(null),
    frame = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false),
    [time, setTime] = useState(0),
    [marked, setMarked] = useState<number | null>(null),
    [error, setError] = useState(''),
    [slow, setSlow] = useState(false),
    [seeking, setSeeking] = useState(false);
  function step(delta: number) {
    const v = video.current;
    if (!v || !loaded) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  }
  function capture() {
    const v = video.current,
      c = frame.current;
    if (!v || !c || v.readyState < 2 || v.seeking) return;
    v.pause();
    const scale = Math.min(1, 768 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.max(1, Math.round(v.videoWidth * scale));
    c.height = Math.max(1, Math.round(v.videoHeight * scale));
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    setMarked(v.currentTime);
  }
  async function replay() {
    const v = video.current;
    if (!v || marked === null) return;
    v.currentTime = Math.max(0, marked - 1);
    try {
      await v.play();
      setError('');
    } catch {
      setError('Playback could not start. Use the video’s play control.');
    }
  }
  return (
    <section className="guided-tool">
      <p>
        Pause at a moment that catches your attention. Save that frame, then
        replay the surrounding movement.
      </p>
      <SeekableVideo
        className="guided-image"
        ref={video}
        src={mediaUrl}
        controls
        playsInline
        preload="metadata"
        seekLabel="Inspection video position"
        onSeeking={() => setSeeking(true)}
        onSeeked={() => {
          setSeeking(false);
          setTime(video.current?.currentTime ?? 0);
        }}
        onLoadedData={() => setLoaded(true)}
        onTimeUpdate={() => setTime(video.current?.currentTime ?? 0)}
        onError={() =>
          setError(
            'This video could not load. Ask your instructor to check its format.',
          )
        }
        onRateChange={() => setSlow((video.current?.playbackRate ?? 1) < 1)}
      />
      <div className="actions">
        <button
          className="secondary"
          disabled={!loaded}
          onClick={() => step(-0.1)}
        >
          −0.1 s
        </button>
        <button
          className="secondary"
          disabled={!loaded}
          onClick={() => step(0.1)}
        >
          +0.1 s
        </button>
        <button
          className="secondary"
          disabled={!loaded}
          aria-pressed={slow}
          onClick={() => {
            if (video.current) video.current.playbackRate = slow ? 1 : 0.25;
          }}
        >
          {slow ? 'Return to normal speed' : 'Slow to ¼ speed'}
        </button>
        <button
          className="primary"
          disabled={!loaded || seeking}
          onClick={capture}
        >
          Save this frame
        </button>
        <span>{time.toFixed(2)} s</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <figure hidden={marked === null}>
        <canvas
          ref={frame}
          className="guided-image"
          aria-label="Saved frame for comparison"
        />
        <figcaption>
          Saved at approximately {marked?.toFixed(2)} s · kept only in this page
        </figcaption>
      </figure>
      {marked !== null && (
        <>
          <button className="secondary" onClick={replay}>
            Replay from 1 second before this frame
          </button>
          <p className="notice">
            Does the detail persist, or change as the scene moves? Adjacent
            frames provide context; smooth playback alone cannot establish
            authenticity.
          </p>
        </>
      )}
      <p className="small muted">
        Timeline steps and frame timestamps are approximate, not exact frame
        advances. No clip is uploaded or analysed by an AI model.
      </p>
    </section>
  );
}
