'use client';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TOOL_INFO, formatModelScore, type DetectorResult } from '@/lib/domain';
import {
  isSessionDetector,
  SESSION_DETECTOR_PRESENTATION,
} from '@/lib/workshop-config';

function detectorLabel(model: string) {
  if (!isSessionDetector(model))
    return TOOL_INFO[model as keyof typeof TOOL_INFO]?.name ?? model;
  return SESSION_DETECTOR_PRESENTATION[model].name;
}

function compactDetectorLabel(model: string) {
  if (model === 'univfd') return 'Universal F.D.';
  if (model === 'community') return 'Comm. F.';
  return detectorLabel(model);
}

function compactSampleScore(score: number) {
  return score >= 0 && score < 0.01 ? '< 0.01' : formatModelScore(score);
}

export function VideoFrameScores({
  results,
  onSeek,
}: {
  results: DetectorResult[];
  onSeek: (seconds: number) => void;
}) {
  const rows = results.filter((r) => r.samples?.length);
  if (!rows.length) return null;
  const times = [
    ...new Set(rows.flatMap((r) => r.samples!.map((s) => s.timeSeconds))),
  ].sort((a, b) => a - b);
  return (
    <section
      className="video-frame-scores"
      aria-label="Sampled-frame detector results"
    >
      <Table className="video-frame-score-table">
        <TableHeader>
          <TableRow>
            <TableHead
              className="video-frame-detector-heading"
              rowSpan={2}
              scope="col"
            >
              Detector
            </TableHead>
            <TableHead
              className="video-frame-time-group"
              colSpan={times.length}
              scope="colgroup"
            >
              Approximate time
            </TableHead>
          </TableRow>
          <TableRow className="video-frame-time-row">
            {times.map((time) => (
              <TableHead
                className="video-frame-time-heading"
                key={time}
                scope="col"
              >
                <button
                  type="button"
                  className="video-frame-time-button"
                  onClick={() => onSeek(time)}
                  aria-label={`Inspect video at ${time.toFixed(2)} seconds`}
                >
                  {time.toFixed(2)} s
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((result) => {
            const fullLabel = detectorLabel(result.model);
            const compactLabel = compactDetectorLabel(result.model);
            return (
              <TableRow key={result.model}>
                <TableHead
                  className="video-frame-detector-name"
                  scope="row"
                  title={compactLabel === fullLabel ? undefined : fullLabel}
                >
                  {compactLabel === fullLabel ? (
                    fullLabel
                  ) : (
                    <>
                      <span aria-hidden="true">{compactLabel}</span>
                      <span className="sr-only">{fullLabel}</span>
                    </>
                  )}
                </TableHead>
                {times.map((time) => {
                  const sample = result.samples!.find(
                    (candidate) => candidate.timeSeconds === time,
                  );
                  const displayedScore = sample
                    ? compactSampleScore(sample.score)
                    : 'Not sampled';
                  const thresholded =
                    sample && sample.score >= 0 && sample.score < 0.01;
                  return (
                    <TableCell
                      className="video-frame-score-cell"
                      key={time}
                      title={
                        thresholded
                          ? `Saved raw score: ${String(sample.score)}`
                          : undefined
                      }
                      aria-label={
                        thresholded
                          ? `Less than 0.01; saved raw score ${String(sample.score)}`
                          : undefined
                      }
                    >
                      {displayedScore}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
