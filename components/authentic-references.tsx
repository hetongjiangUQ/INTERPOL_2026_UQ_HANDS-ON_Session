'use client';
import { useState } from 'react';
import { AUTHENTIC_REFERENCES } from '@/lib/authentic-references';
import { MediaInspector } from './media-inspector';

export function AuthenticReferences() {
  const [selected, setSelected] = useState(0);
  const reference = AUTHENTIC_REFERENCES[selected];
  return (
    <aside className="panel comparison-column authentic-references" aria-label="Authentic references">
      <MediaInspector key={reference.exercise.id} exercise={reference.exercise} unlocked referenceOnly
        comparisonHeader={<>
        <h2>Authentic references</h2>
        <p className="small muted">Compare normal image patterns. These references are not quizzes or proof that a similar-looking image is authentic.</p>
        <div className="reference-selector" role="group" aria-label="Choose an authentic reference">
          {AUTHENTIC_REFERENCES.map((item, i) => (
            <button key={item.exercise.id} className={`secondary${selected === i ? ' selected' : ''}`}
              aria-pressed={selected === i} onClick={() => setSelected(i)}>{item.label}</button>
          ))}
        </div>
        <p className="small muted">{reference.note}</p>
        </>} />
    </aside>
  );
}
