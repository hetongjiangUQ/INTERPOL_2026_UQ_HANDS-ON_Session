'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  formatModelScore,
  TOOL_INFO,
  isSavedTool,
  SCORE_INFO,
  type Exercise,
  type ToolId,
  type DetectorResult,
} from '@/lib/domain';
import { api } from '@/lib/client';
import { VisualInspector } from './visual-inspector';
import { PracticeTool, isGuidedTool } from './practice-tools';
import {
  DetectorComparison,
  type VideoSequenceLoadState,
} from './detector-comparison';
import {
  isSessionDetector,
  type DetectorLoadState,
  type SessionDetector,
} from '@/lib/workshop-config';
import { VideoFrameScores } from './video-frame-scores';
import { PortraitQuizEvidence } from './portrait-quiz-evidence';
import { quizCandidate } from '@/lib/quiz-bank';
import {
  videoSequenceMethods,
  type VideoSequenceEvidence,
} from '@/lib/video-sequence-evidence';
import { SeekableVideo } from './seekable-video';
import { VideoInspectionFrame, type InspectionFrame } from './video-inspection-frame';

const IMAGE_VIEWPORT_MAX_HEIGHT = 520;
// Shared neutral inspection controls, independent of a case's source label.
const IMAGE_INSPECTION_TOOLS: ToolId[] = ['texture', 'highpass', 'compression', 'ela'];

export function MediaInspector({
  exercise: e,
  unlocked,
  simple = false,
  participantHeader,
  comparisonReference,
  comparisonHeader,
  referenceOnly = false,
}: {
  exercise: Exercise;
  unlocked: boolean;
  simple?: boolean;
  participantHeader?: ReactNode;
  comparisonReference?: ReactNode;
  comparisonHeader?: ReactNode;
  referenceOnly?: boolean;
}) {
  const mediaStage = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(100),
    [tool, setTool] = useState<ToolId | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [result, setResult] = useState<DetectorResult | null>(null),
    [quality, setQuality] = useState(85),
    [gain, setGain] = useState(12),
    [channel, setChannel] = useState('rgb'),
    [time, setTime] = useState(0);
  const [mediaStageWidth, setMediaStageWidth] = useState(0);
  const [inspectionFrame, setInspectionFrame] = useState<InspectionFrame | null>(null);
  const [frameError, setFrameError] = useState('');
  const [detectorError, setDetectorError] = useState('');
  const [frameZoom, setFrameZoom] = useState(100);
  const inspectionUrl = e.kind === 'video' ? inspectionFrame?.url : e.mediaUrl;
  const [loadedImage, setLoadedImage] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);
  const [detectorResults, setDetectorResults] = useState<
    Partial<Record<ToolId, DetectorResult>>
  >({});
  const [detectorLoadStates, setDetectorLoadStates] = useState<
    Partial<Record<SessionDetector, DetectorLoadState>>
  >({});
  const [detectorRevealComplete, setDetectorRevealComplete] = useState(false);
  const [sequenceEvidence, setSequenceEvidence] =
    useState<VideoSequenceEvidence | null>(null);
  const [sequenceLoadState, setSequenceLoadState] =
    useState<VideoSequenceLoadState>('not-requested');
  const candidate = referenceOnly ? undefined : quizCandidate(e.id);
  const detectors = referenceOnly ? [] : e.tools.filter(isSessionDetector);
  const sequenceMethods = referenceOnly ? [] : videoSequenceMethods(e.id);
  const manualTools = e.kind === 'image' || e.kind === 'video' ? IMAGE_INSPECTION_TOOLS : [
    ...new Set([
      ...e.tools.filter((id) => id !== 'metadata' && !isSessionDetector(id)),
      ...(candidate?.manualTools ?? []),
    ]),
  ];
  const portraitQuiz = !!candidate?.portrait;
  const pairedPortrait = !!candidate?.stress;
  const visibleDetectorResults = unlocked
    ? detectors.flatMap((id) =>
        detectorResults[id] ? [detectorResults[id]!] : [],
      )
    : [];
  const hasVideoSamples =
    e.kind === 'video' &&
    visibleDetectorResults.some(
      (detectorResult) => detectorResult.samples?.length,
    );
  const toolName = (id: ToolId) => TOOL_INFO[id].name;
  useEffect(() => {
    if (unlocked && detectors.length > 0) void revealDetectors();
  }, [e.id, e.sha256, unlocked]);
  useEffect(() => {
    if (e.kind !== 'image') return;
    const stage = mediaStage.current;
    if (!stage) return;
    const measure = () => setMediaStageWidth(stage.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [e.kind, e.mediaUrl]);
  useEffect(() => {
    if (!pairedPortrait) return;
    if (!unlocked) {
      setZoom(100);
      return;
    }
    try {
      const saved = Number(
        sessionStorage.getItem('evidence-lab-portrait-pair-zoom'),
      );
      if ([100, 200, 300].includes(saved)) setZoom(saved);
    } catch {
      /* A blocked session store must not disable portrait inspection. */
    }
  }, [pairedPortrait, unlocked]);
  function changeZoom(value: number) {
    setZoom(value);
    if (pairedPortrait)
      try {
        sessionStorage.setItem(
          'evidence-lab-portrait-pair-zoom',
          String(value),
        );
      } catch {
        /* Keep the selected zoom for this case even if tab storage is unavailable. */
      }
  }
  async function revealDetectors() {
    if (referenceOnly) return;
    setTool(null);
    setBusy(true);
    setMessage('');
    setDetectorRevealComplete(false);
    setDetectorResults({});
    setDetectorLoadStates({});
    setSequenceEvidence(null);
    setSequenceLoadState('not-requested');
    const errors: string[] = [];
    const requests: Promise<void>[] = detectors.map(async (id) => {
      try {
        const data = await api<{ result: DetectorResult | null }>(
          `result/${e.id}/${id}`,
        );
        if (!data.result) {
          setDetectorLoadStates((previous) => ({
            ...previous,
            [id]: 'no-result',
          }));
          return;
        }
        if (data.result.model !== id || data.result.mediaSha256 !== e.sha256)
          throw new Error('Matching result unavailable.');
        setDetectorResults((previous) => ({ ...previous, [id]: data.result! }));
        setDetectorLoadStates((previous) => ({ ...previous, [id]: 'loaded' }));
      } catch {
        setDetectorLoadStates((previous) => ({
          ...previous,
          [id]: 'load-error',
        }));
        errors.push(TOOL_INFO[id].name);
      }
    });
    if (sequenceMethods.length)
      requests.push(
        (async () => {
          try {
            const data = await api<VideoSequenceEvidence>(
              `video-sequence-evidence/${e.id}`,
            );
            if (
              data.exerciseId !== e.id ||
              data.mediaSha256 !== e.sha256 ||
              sequenceMethods.some(
                (method) =>
                  !data.results.some((result) => result.method === method),
              )
            )
              throw new Error('Matching temporal result unavailable.');
            setSequenceEvidence(data);
            setSequenceLoadState('loaded');
          } catch {
            setSequenceLoadState('load-error');
            errors.push('D3 / PwTF-DVD');
          }
        })(),
      );
    await Promise.all(requests);
    setDetectorRevealComplete(true);
    setBusy(false);
    setDetectorError(errors.length ?
        'Could not load: ' +
          errors.join(', ') +
          '. Try again or ask the instructor.' : '');
  }
  async function run(id: ToolId) {
    setTool(id);
    setMessage('');
    setResult(null);
    setBusy(true);
    try {
      if (isSavedTool(id)) {
        if (isSessionDetector(id))
          setDetectorResults((previous) => {
            const next = { ...previous };
            delete next[id];
            return next;
          });
        const data = await api<{ result: DetectorResult | null }>(
          `result/${e.id}/${id}`,
        );
        setResult(data.result);
        if (
          data.result &&
          isSessionDetector(id) &&
          data.result.model === id &&
          data.result.mediaSha256 === e.sha256
        )
          setDetectorResults((previous) => ({
            ...previous,
            [id]: data.result!,
          }));
        if (!data.result)
          setMessage(
            'No result has been imported for this file. Ask the instructor to run the detector and import its output.',
          );
      }
      if (id === 'ela') {
        if (!inspectionUrl) throw new Error('The inspection frame is not ready yet.');
        const image = new Image();
        image.src = inspectionUrl;
        await image.decode();
        const scale = Math.min(
          1,
          1400 / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.round(image.naturalWidth * scale),
          height = Math.round(image.naturalHeight * scale);
        const source = document.createElement('canvas');
        source.width = width;
        source.height = height;
        const ctx = source.getContext('2d')!;
        ctx.drawImage(image, 0, 0, width, height);
        const before = ctx.getImageData(0, 0, width, height);
        const jpeg = new Image();
        jpeg.src = source.toDataURL('image/jpeg', quality / 100);
        await jpeg.decode();
        ctx.drawImage(jpeg, 0, 0);
        const after = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < before.data.length; i += 4) {
          for (let c = 0; c < 3; c++)
            before.data[i + c] = Math.min(
              255,
              channel === 'rgb' || ['r', 'g', 'b'][c] === channel
                ? Math.abs(before.data[i + c] - after.data[i + c]) * gain
                : 0,
            );
          before.data[i + 3] = 255;
        }
        if (canvas.current) {
          canvas.current.width = width;
          canvas.current.height = height;
          canvas.current.getContext('2d')!.putImageData(before, 0, 0);
        }
        setMessage(
          `Recompressed at JPEG quality ${quality}%; differences amplified ×${gain}; channel ${channel.toUpperCase()}.${scale < 1 ? ' Display reduced to 1,400 pixels on the longest side.' : ''} Bright areas can result from ordinary texture, edges, or compression.`,
        );
      }
      if (id === 'spectrum') {
        if (e.bytes > 10 * 1024 * 1024)
          throw new Error(
            'Waveform view is limited to 10 MiB. Use a shorter clip for this browser exercise.',
          );
        const probe = document.createElement(
          e.kind === 'video' ? 'video' : 'audio',
        );
        probe.preload = 'metadata';
        probe.src = e.mediaUrl;
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error('Could not read media duration.')),
              10000,
            );
            probe.onloadedmetadata = () => {
              clearTimeout(timer);
              resolve();
            };
            probe.onerror = () => {
              clearTimeout(timer);
              reject(new Error('Browser cannot read this media format.'));
            };
          });
          if (!Number.isFinite(probe.duration) || probe.duration > 60)
            throw new Error('Waveform view supports clips up to 60 seconds.');
        } finally {
          probe.removeAttribute('src');
          probe.load();
        }
        const context = new AudioContext();
        try {
          const buffer = await context.decodeAudioData(
            await (await fetch(e.mediaUrl)).arrayBuffer(),
          );
          const channel = buffer.getChannelData(0),
            c = canvas.current!;
          c.width = 1000;
          c.height = 220;
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = '#102740';
          ctx.fillRect(0, 0, 1000, 220);
          ctx.strokeStyle = '#65c4ed';
          ctx.beginPath();
          for (let x = 0; x < 1000; x++) {
            const a = Math.floor((x * channel.length) / 1000),
              b = Math.max(
                a + 1,
                Math.floor(((x + 1) * channel.length) / 1000),
              );
            let min = 1,
              max = -1;
            for (let i = a; i < Math.min(b, channel.length); i++) {
              min = Math.min(min, channel[i]);
              max = Math.max(max, channel[i]);
            }
            ctx.moveTo(x, 110 + min * 95);
            ctx.lineTo(x, 110 + max * 95);
          }
          ctx.stroke();
          setMessage(
            `${buffer.duration.toFixed(2)} seconds · ${buffer.sampleRate.toLocaleString()} Hz · channel 1 of ${buffer.numberOfChannels}. Each column shows the minimum and maximum amplitude. A waveform cannot determine whether speech is synthetic.`,
          );
        } finally {
          await context.close();
        }
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'The browser could not analyse this format.',
      );
    } finally {
      setBusy(false);
    }
  }
  function capture() {
    const v = video.current,
      c = canvas.current;
    if (!v || !c || !v.videoWidth) return;
    const scale = Math.min(1, 1400 / v.videoWidth);
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    setTime(v.currentTime);
  }
  const currentImage = loadedImage?.src === e.mediaUrl ? loadedImage : null;
  const fittedImageStyle =
    currentImage && mediaStageWidth > 0
      ? (() => {
          const fitScale = Math.min(
            mediaStageWidth / currentImage.width,
            IMAGE_VIEWPORT_MAX_HEIGHT / currentImage.height,
          );
          const zoomScale = fitScale * (zoom / 100);
          return {
            width: `${currentImage.width * zoomScale}px`,
            height: `${currentImage.height * zoomScale}px`,
            maxWidth: 'none',
            maxHeight: 'none',
          };
        })()
      : {
          width: 'auto',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: `${IMAGE_VIEWPORT_MAX_HEIGHT}px`,
        };
  const mediaContent = (
    <>
      {participantHeader}
      <div ref={mediaStage} className="media-stage">
        {e.kind === 'image' ? (
          <div
            className="image-scroll"
            style={{ maxHeight: `${IMAGE_VIEWPORT_MAX_HEIGHT}px` }}
          >
            <img
              src={e.mediaUrl}
              alt={referenceOnly ? e.title : 'Exercise image for assessment'}
              style={fittedImageStyle}
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
                  setLoadedImage(null);
                  return;
                }
                setLoadedImage({
                  src: e.mediaUrl,
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                });
              }}
            />
          </div>
        ) : e.kind === 'video' ? (
          <SeekableVideo
            ref={video}
            src={e.mediaUrl}
            controls
            preload="metadata"
            playsInline
            seekLabel={`${e.title} position`}
          />
        ) : (
          <div className="audio-stage">
            <span aria-hidden="true">♫</span>
            <audio src={e.mediaUrl} controls preload="metadata" />
          </div>
        )}
      </div>
      {imageZoom()}
      {e.kind === 'video' && <>
        <VideoInspectionFrame src={e.mediaUrl} exerciseId={e.id} onFrame={setInspectionFrame} onError={setFrameError} />
        <div className="actions" aria-label="Video timing controls">
          <button className="secondary" onClick={() => video.current?.pause()}>Pause</button>
          <button className="secondary" onClick={() => {
            const v = video.current; if (!v) return;
            v.currentTime = Math.max(0, v.currentTime - 1);
            void v.play().catch(() => setFrameError('Use the video play control to resume playback.'));
          }}>Replay previous second</button>
          <button className="secondary" onClick={() => {
            const v = video.current; if (!v) return;
            v.currentTime = 0;
            void v.play().catch(() => setFrameError('Use the video play control to resume playback.'));
          }}>Replay from start</button>
          {[1, 0.25].map(rate => <button key={rate} className="secondary" onClick={() => {
            if (video.current) video.current.playbackRate = rate;
          }}>{rate === 1 ? 'Normal speed' : 'Quarter speed'}</button>)}
          {[-0.1, 0.1].map(step => <button key={step} className="secondary" onClick={() => {
            const v = video.current; if (!v || !Number.isFinite(v.duration)) return;
            v.pause(); v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + step));
          }}>{step < 0 ? '−0.1 seconds' : '+0.1 seconds'}</button>)}
        </div>
        <h3>Single-frame inspection</h3>
        <p>This single frame from the video may help you assess it. Use the image inspection tools below; one frame cannot show motion consistency.</p>
        {inspectionFrame ? <>
          <div className="image-scroll" style={{maxHeight: '520px'}}>
            <img src={inspectionFrame.url} alt={`Inspection frame at ${inspectionFrame.time.toFixed(2)} seconds`} style={{width: `${frameZoom}%`, maxWidth: 'none'}} />
          </div>
          <div className="zoom-control">
            <label>Frame zoom {frameZoom}%</label>
            <Slider aria-label="Frame zoom" min={100} max={300} step={25} value={[frameZoom]} onValueChange={v => setFrameZoom(Array.isArray(v) ? v[0] : v)} />
          </div>
          <p className="small muted">Frame at {inspectionFrame.time.toFixed(2)} s · browser-decoded PNG preview, up to 1,920 pixels on the longest side. Saved detector scores still refer to the video, not this PNG.</p>
        </> : <p role="status">{frameError || 'Preparing inspection frame…'}</p>}
      </>}
    </>
  );
  function imageZoom() {
    return e.kind === 'image' ? (
        <div className="zoom-control">
          <label htmlFor={`${e.id}-zoom`}>
            Zoom {zoom}%
          </label>
          <Slider
            id={`${e.id}-zoom`}
            aria-label="Image zoom"
            min={100}
            max={300}
            step={25}
            disabled={!unlocked}
            value={[zoom]}
            onValueChange={(v) => changeZoom(Array.isArray(v) ? v[0] : v)}
          />
        </div>
    ) : null;
  }
  const manualContent = (
    <>
      {manualTools.length > 0 && (
        <div className="section-heading">
          <h3>Inspection aids</h3>
        </div>
      )}
      <div className="tool-grid">
        {manualTools.map((id) => (
          <button
            key={id}
            className={`tool-button ${tool === id ? 'selected' : ''}`}
            disabled={!unlocked || busy || (e.kind === 'video' && !inspectionFrame)}
            onClick={() => run(id)}
          >
            <span>{toolName(id)}</span>
          </button>
        ))}
      </div>
      {tool && unlocked && (!isSessionDetector(tool) || e.kind !== 'image') && (
        <div className="tool-output">
          <h3>{toolName(tool)}</h3>
          {isGuidedTool(tool) && (
            <PracticeTool key={e.id + tool} tool={tool} exercise={e.kind === 'video' && inspectionUrl ? {...e, kind: 'image', mediaUrl: inspectionUrl} : e} />
          )}
          {(tool === 'layers' || tool === 'texture' || tool === 'highpass') && (
            <VisualInspector
              key={tool}
              mediaUrl={inspectionUrl!}
              tool={tool}
              simple={false}
            />
          )}

          {tool === 'ela' && (
            <div className="zoom-control">
              <label>JPEG quality {quality}%</label>
              <Slider
                aria-label="JPEG quality"
                min={30}
                max={95}
                step={5}
                value={[quality]}
                onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)}
              />
              <label>Amplification ×{gain}</label>
              <Slider
                aria-label="Residual amplification"
                min={1}
                max={40}
                step={1}
                value={[gain]}
                onValueChange={(v) => setGain(Array.isArray(v) ? v[0] : v)}
              />
              <label>
                Colour channel
                <NativeSelect
                  aria-label="Residual colour channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <NativeSelectOption value="rgb">RGB</NativeSelectOption>
                  <NativeSelectOption value="r">Red</NativeSelectOption>
                  <NativeSelectOption value="g">Green</NativeSelectOption>
                  <NativeSelectOption value="b">Blue</NativeSelectOption>
                </NativeSelect>
              </label>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => run('ela')}
              >
                Recalculate
              </button>
            </div>
          )}
          {tool === 'frames' && (
            <div className="actions">
              <button
                className="secondary"
                onClick={() => {
                  if (video.current) {
                    video.current.pause();
                    video.current.currentTime = Math.max(
                      0,
                      video.current.currentTime - 0.1,
                    );
                  }
                }}
              >
                −0.1 seconds
              </button>
              <button
                className="secondary"
                onClick={() => {
                  if (video.current) {
                    video.current.pause();
                    video.current.currentTime = Math.min(
                      video.current.duration || 0,
                      video.current.currentTime + 0.1,
                    );
                  }
                }}
              >
                +0.1 seconds
              </button>
              <button className="secondary" onClick={capture}>
                Capture current frame
              </button>
              <span>{time.toFixed(2)} s</span>
              <p className="small muted">
                Timeline stepping is approximate; it is not an exact one-frame
                advance.
              </p>
            </div>
          )}
          {['ela', 'frames', 'spectrum'].includes(tool) && (
            <canvas
              ref={canvas}
              className="analysis-canvas"
              aria-label="Media inspection output"
            />
          )}
          {busy && (
            <p role="status">
              {tool && isSavedTool(tool)
                ? 'Loading saved result…'
                : 'Processing in your browser…'}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}

          {result && (
            <div>
              <p className="score">
                {result.score === null ? '' : formatModelScore(result.score)}{' '}
                <span>{SCORE_INFO[result.scoreType].label}</span>
              </p>
              <p>{SCORE_INFO[result.scoreType].explanation}</p>
              <p className="notice">{result.note}</p>
              {result.findings?.map((f, i) => (
                <div key={i}>
                  <strong>{f.method}</strong>
                  <pre className="bits">{f.preview}</pre>
                </div>
              ))}
              <details>
                <summary>Model, file and processing record</summary>
                <dl className="facts">
                  <dt>Model version</dt>
                  <dd>{result.modelVersion}</dd>
                  <dt>Processed</dt>
                  <dd>{result.createdAt}</dd>
                  <dt>Preprocessing</dt>
                  <dd>{result.preprocessing}</dd>
                  <dt>Media SHA-256</dt>
                  <dd className="hash">{result.mediaSha256}</dd>
                </dl>
                {result.samples && (
                  <ul>
                    {result.samples.map((s, i) => (
                      <li key={i}>
                        {s.timeSeconds.toFixed(2)} s:{' '}
                        {formatModelScore(s.score)}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="small muted">
                  Instructor-imported result. The file hash matches; the site
                  does not independently authenticate who ran the model.
                </p>
              </details>
            </div>
          )}
        </div>
      )}
    </>
  );
  const detectorContent = (
    <>
      {portraitQuiz && (
        <PortraitQuizEvidence exerciseId={e.id} unlocked={unlocked} />
      )}
      {detectors.length > 0 && (
        <section className="detector-evidence">
          <div className="section-heading">
            <h3>Saved model evidence</h3>
          </div>
          {detectorError && <button
            className="primary"
            disabled={!unlocked || busy}
            onClick={revealDetectors}
          >
            {busy ? 'Loading saved results…' : 'Retry loading results'}
          </button>}
          {busy && <p role="status">Loading saved results…</p>}
          {detectorError && <p role="alert">{detectorError}</p>}
          {e.kind === 'video' ? (
            <Tabs className="detector-result-tabs" defaultValue="detectors">
              <TabsList variant="line" aria-label="Video detector result views">
                <TabsTrigger value="detectors">Detector scores</TabsTrigger>
                <TabsTrigger
                  value="samples"
                  disabled={!detectorRevealComplete || !hasVideoSamples}
                >
                  Approximate time
                </TabsTrigger>
              </TabsList>
              <TabsContent value="detectors">
                <DetectorComparison
                  exerciseId={e.id}
                  configuredModels={detectors}
                  results={visibleDetectorResults}
                  revealed={detectorRevealComplete}
                  loadStates={detectorLoadStates}
                  sequenceMethods={sequenceMethods}
                  sequenceEvidence={unlocked ? sequenceEvidence : null}
                  sequenceLoadState={sequenceLoadState}
                  unavailableReasons={candidate?.unavailableDetectors}
                />
              </TabsContent>
              <TabsContent value="samples">
                <VideoFrameScores
                  results={visibleDetectorResults}
                  onSeek={(seconds) => {
                    const v = video.current;
                    if (v && Number.isFinite(v.duration)) {
                      v.pause();
                      v.currentTime = Math.min(seconds, v.duration);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <DetectorComparison
              exerciseId={e.id}
              configuredModels={detectors}
              results={visibleDetectorResults}
              revealed={detectorRevealComplete}
              loadStates={detectorLoadStates}
              sequenceMethods={sequenceMethods}
              sequenceEvidence={unlocked ? sequenceEvidence : null}
              sequenceLoadState={sequenceLoadState}
              unavailableReasons={candidate?.unavailableDetectors}
            />
          )}
          {message && !tool && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </section>
      )}
    </>
  );
  const inspectionControls = unlocked ? manualContent : (
    <div className="inspection-locked" role="status">
      <strong>Available after your first answer</strong>
      <p>Save your first answer below to unlock the inspection aids and saved model evidence.</p>
    </div>
  );
  if (referenceOnly && comparisonHeader)
    return <>
      <header className="comparison-heading">{comparisonHeader}</header>
      <div className="comparison-media">{mediaContent}</div>
      <section className="comparison-tools" aria-label="Reference inspection aids">{inspectionControls}</section>
    </>;
  if (participantHeader)
    return (
      <div className="inspection-layout">
        <div className="inspection-workspace">
          <section className="panel comparison-column quiz-comparison" aria-label="Quiz media and inspection aids">
            <header className="comparison-heading"><h2>{e.kind === 'video' ? 'Quiz video and inspection frame' : 'Quiz image'}</h2></header>
            <div className="comparison-media">{mediaContent}</div>
            <section className="comparison-tools" aria-label="Quiz inspection aids">{inspectionControls}</section>
          </section>
          {comparisonReference}
        </div>
        {unlocked && <section className="panel evidence-pane" aria-label="Quiz detector evidence">{detectorContent}</section>}
      </div>
    );
  return (
    <div>
      {mediaContent}
      {manualContent}
      {detectorContent}
    </div>
  );
}
