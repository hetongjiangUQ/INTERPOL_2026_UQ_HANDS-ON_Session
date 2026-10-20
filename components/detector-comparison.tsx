'use client';

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  formatModelScore,
  SCORE_INFO,
  type DetectorResult,
} from '@/lib/domain';
import {
  SESSION_DETECTORS,
  SESSION_DETECTOR_PRESENTATION,
  detectorRowState,
  detectorRowText,
  type DetectorLoadState,
  type SessionDetector,
} from '@/lib/workshop-config';
import {
  VIDEO_SEQUENCE_METHODS,
  videoSequenceAudienceSummary,
  type VideoSequenceEvidence,
  type VideoSequenceMethod,
} from '@/lib/video-sequence-evidence';

export type VideoSequenceLoadState =
  | 'not-requested'
  | 'loaded'
  | 'no-result'
  | 'load-error';

type Props = {
  exerciseId: string;
  results: DetectorResult[];
  configuredModels: SessionDetector[];
  revealed: boolean;
  loadStates: Partial<Record<SessionDetector, DetectorLoadState>>;
  unavailableReasons?: Partial<Record<SessionDetector, 'requires-face'>>;
  sequenceMethods?: readonly VideoSequenceMethod[];
  sequenceEvidence?: VideoSequenceEvidence | null;
  sequenceLoadState?: VideoSequenceLoadState;
};

export function DetectorComparison({
  exerciseId,
  results,
  configuredModels,
  revealed,
  loadStates,
  unavailableReasons = {},
  sequenceMethods = [],
  sequenceEvidence = null,
  sequenceLoadState = 'not-requested',
}: Props) {
  const scored = results.filter(
    (r) =>
      r.score !== null &&
      ['synthetic_sigmoid', 'synthetic_softmax', 'manipulation_score'].includes(
        r.scoreType,
      ),
  );
  const sequenceResults = sequenceMethods.flatMap((method) => {
    const result = sequenceEvidence?.results.find(
      (candidate) => candidate.method === method,
    );
    return result ? [result] : [];
  });
  const hasSequenceRows = sequenceMethods.length > 0;
  return (
    <section className="detector-comparison" aria-label="Detector scores">
      <Table className="detector-table">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Detector</TableHead>
            <TableHead scope="col">
              {hasSequenceRows
                ? 'Saved detector result'
                : 'Raw model score · 0–1'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SESSION_DETECTORS.map((model) => {
            const r = scored.find((r) => r.model === model),
              presentation = SESSION_DETECTOR_PRESENTATION[model],
              empty = detectorRowState(
                revealed,
                configuredModels.includes(model),
                loadStates[model],
                unavailableReasons[model],
              );
            return (
              <TableRow key={model}>
                <TableHead scope="row">
                  {presentation.name}
                  <small className="block">{presentation.task}</small>
                </TableHead>
                <TableCell>
                  {revealed && r ? (
                    <div className="detector-score-cell">
                      <div
                        className="detector-meter"
                        role="meter"
                        aria-label={
                          presentation.name +
                          ' ' +
                          SCORE_INFO[r.scoreType].label
                        }
                        aria-valuemin={0}
                        aria-valuemax={1}
                        aria-valuenow={r.score!}
                      >
                        <span style={{ width: `${r.score! * 100}%` }} />
                      </div>
                      <output>{formatModelScore(r.score!)}</output>
                    </div>
                  ) : (
                    <span className="small muted">
                      {detectorRowText(empty)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {sequenceMethods.map((method, index) => {
            const result = sequenceResults.find(
              (candidate) => candidate.method === method,
            );
            const empty = !revealed
              ? 'Not revealed'
              : sequenceLoadState === 'load-error'
                ? 'Could not load cached result'
                : 'Not run — no cached result';
            return (
              <TableRow
                key={method}
                className={index === 0 ? 'temporal-detector-start' : undefined}
              >
                <TableHead scope="row">
                  {VIDEO_SEQUENCE_METHODS[method].name}
                  <small className="block">
                    Temporal video detector ·{' '}
                    {VIDEO_SEQUENCE_METHODS[method].task}
                  </small>
                </TableHead>
                <TableCell>
                  {revealed && result ? (
                    <div className="temporal-detector-output">
                      <p>{videoSequenceAudienceSummary(exerciseId, result)}</p>
                    </div>
                  ) : (
                    <span className="small muted">{empty}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
