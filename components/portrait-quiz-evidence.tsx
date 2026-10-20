'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/client';
import { DetectorComparison } from '@/components/detector-comparison';
import { type DetectorResult } from '@/lib/domain';
import {
  PORTRAIT_MODELS,
  PORTRAIT_QUIZ_CLASSIFIERS,
  type PortraitQuizEvidence as PortraitEvidence,
} from '@/lib/portrait-catalog';
import {
  type DetectorLoadState,
  type SessionDetector,
} from '@/lib/workshop-config';

const modelName = (id: string) =>
  PORTRAIT_MODELS.find((model) => model.id === id)?.name ?? id;

export function PortraitQuizEvidence({
  exerciseId,
  unlocked,
}: {
  exerciseId: string;
  unlocked: boolean;
}) {
  const [data, setData] = useState<PortraitEvidence | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load() {
    setBusy(true);
    setError('');
    try {
      setData(await api<PortraitEvidence>(`portrait-evidence/${exerciseId}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (unlocked) void load();
  }, [exerciseId, unlocked]);
  const classifierResults: DetectorResult[] =
    data?.classifiers.map((result) => ({
      schemaVersion: 1,
      model: result.model,
      modelVersion: result.modelVersion!,
      mediaSha256: result.mediaSha256,
      preprocessing: result.preprocessing!,
      createdAt: result.createdAt,
      score: result.score!,
      scoreType: result.scoreType as DetectorResult['scoreType'],
      note: result.note!,
    })) ?? [];
  const loadStates: Partial<Record<SessionDetector, DetectorLoadState>> = data
    ? Object.fromEntries(
        PORTRAIT_QUIZ_CLASSIFIERS.map((model) => [model, 'loaded']),
      )
    : {};
  return (
    <section
      className="portrait-quiz-evidence"
      aria-labelledby={`${exerciseId}-evidence-title`}
    >
      <div className="section-heading">
        <h3 id={`${exerciseId}-evidence-title`}>Saved model evidence</h3>
      </div>
      {busy && <p role="status">Loading saved results…</p>}
      {!unlocked && (
        <p className="small muted">
          Save your first judgement to unlock the saved evidence.
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}{' '}
          <button className="secondary" onClick={load}>
            Retry
          </button>
        </p>
      )}
      <DetectorComparison
        exerciseId={exerciseId}
        configuredModels={[...PORTRAIT_QUIZ_CLASSIFIERS]}
        results={classifierResults}
        revealed={!!data}
        loadStates={loadStates}
      />
      {data && data.maps.length > 0 && (
        <>
          <div className="section-heading portrait-map-heading">
            <div>
              <h4>Localisation response maps</h4>
              <p className="small muted">
                Brighter areas are stronger model responses, not proof of
                editing.
              </p>
            </div>
          </div>
          <div className="portrait-quiz-maps">
            {data.maps.map((map) => (
              <section className="portrait-mask" key={map.model}>
                <h4>{modelName(map.model)}</h4>
                <Image
                  unoptimized
                  src={`/api/portrait-evidence/${exerciseId}/mask/${map.model}`}
                  alt={`${modelName(map.model)} raw localisation response; black is zero and white is one`}
                  width={map.width}
                  height={map.height}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
