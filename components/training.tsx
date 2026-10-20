'use client';
import { useEffect, useRef, useState } from 'react';
import { Header } from './header';
import { MediaInspector } from './media-inspector';
import { AuthenticReferences } from './authentic-references';
import { ReviewNavigation } from './review-navigation';
import { api } from '@/lib/client';
import { useWorkshop } from './workshop-provider';
import {
  RECONSIDERED_LABELS,
  CLASSIFICATION_GUIDANCE,
  type Exercise,
  type ReconsideredSelection,
} from '@/lib/domain';
import { type PracticeConfig } from '@/lib/workshop-config';
type LiveExercise = Exercise & { practice: PracticeConfig };
type Answer = { selections: ReconsideredSelection[]; basis: string };

export function Training() {
  const { snapshot, error: configError, reload } = useWorkshop();
  const version = useRef(0);
  const [exercises, setExercises] = useState<LiveExercise[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  async function refresh() {
    const request = ++version.current;
    try {
      const data = await api<{
        exercises: LiveExercise[];
        workshopRevision: number;
      }>('exercises');
      if (request !== version.current) return;
      setExercises(data.exercises);
      setRevision(data.workshopRevision);
      setSelected((id) =>
        data.exercises.some((e) => e.id === id)
          ? id
          : data.exercises[0]?.id || '',
      );
      setError('');
    } catch (e) {
      if (request === version.current) setError((e as Error).message);
    } finally {
      if (request === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [snapshot?.revision]);
  const index = exercises.findIndex((e) => e.id === selected),
    exercise = exercises[index];
  return (
    <>
      <Header />
      <main className="page training-page">
        <ReviewNavigation />
        <div className="session-heading">
          <div>
            <p className="eyebrow">DEEPFAKE DETECTION · ANSWER REVIEW</p>
            <h1>{exercise?.title ?? 'Quiz review'}</h1>
            <p>
              Explore each quiz, then reveal its documented answer. No answers
              are submitted in this version.
            </p>
          </div>
        </div>
        {(error || configError) && (
          <div className="error" role="alert">
            {error || configError}{' '}
            <button
              onClick={() => {
                refresh();
                reload();
              }}
            >
              Refresh
            </button>
          </div>
        )}
        {loading || !snapshot ? (
          <p role="status">Loading the session…</p>
        ) : !exercises.length ? (
          <section className="panel">
            <h2>No quizzes available</h2>
            <p>Practices will appear when your instructor opens them.</p>
          </section>
        ) : (
          <section className="quiz-column" aria-label="Current quiz">
            <div className="practice-progress">
              <span>
                QUIZ {index + 1} OF {exercises.length}
              </span>
              <nav className="actions" aria-label="Practice navigation">
                {exercises.map((e, i) => (
                  <button
                    key={e.id}
                    className={
                      selected === e.id ? 'secondary selected' : 'secondary'
                    }
                    aria-current={selected === e.id ? 'step' : undefined}
                    aria-label={'Quiz ' + (i + 1) + ': ' + e.title}
                    onClick={() => setSelected(e.id)}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </div>
            {exercise && (
              <ExerciseView
                key={exercise.id + ':' + exercise.revision + ':' + revision}
                exercise={exercise}
                workshopRevision={revision}
                onNext={
                  index < exercises.length - 1
                    ? () => setSelected(exercises[index + 1].id)
                    : undefined
                }
              />
            )}
          </section>
        )}
      </main>
    </>
  );
}
function ExerciseView({
  exercise: e,
  workshopRevision,
  onNext,
}: {
  exercise: LiveExercise;
  workshopRevision: number;
  onNext?: () => void;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function toggleAnswer() {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setError('');
    if (answer) {
      setRevealed(true);
      return;
    }
    setBusy(true);
    try {
      setAnswer(await api<Answer>('review/answer/' + encodeURIComponent(e.id)));
      setRevealed(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="participant-exercise">
      <MediaInspector
        key={e.id + ':' + e.revision + ':' + workshopRevision}
        exercise={e}
        unlocked={true}
        simple={!e.practice.advanced}
        participantHeader={<></>}
        comparisonReference={<AuthenticReferences />}
      />
      <section
        className="answer-panel assessment panel"
        aria-label="Documented answer"
      >
        <button
          className="primary full"
          onClick={toggleAnswer}
          disabled={busy}
          aria-expanded={revealed}
          aria-controls={'answer-' + e.id}
        >
          {busy
            ? 'Loading answer…'
            : revealed
              ? 'Hide answer'
              : 'Reveal answer'}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div id={'answer-' + e.id} hidden={!revealed}>
          {answer && (
            <div className="debrief">
              <h2>Documented answer</h2>
              <ul>
                {answer.selections.map((s) => (
                  <li key={s}>{RECONSIDERED_LABELS[s]}</li>
                ))}
              </ul>
              <p>{answer.basis}</p>
              <p className="small muted">{CLASSIFICATION_GUIDANCE}</p>
              <p className="small muted">
                This answer comes from source and processing records. Detector
                results are separate evidence.
              </p>
            </div>
          )}
        </div>
        {onNext && (
          <button className="secondary full" onClick={onNext}>
            Next quiz →
          </button>
        )}
      </section>
    </div>
  );
}
