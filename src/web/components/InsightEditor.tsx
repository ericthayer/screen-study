import { useState } from 'react';
import type { MediaWithInsight } from '../../shared/types';
import { api } from '../api';

interface Props {
  media: MediaWithInsight;
  onClose: () => void;
  onSaved: () => void;
}

/** Human review/edit dialog for AI-extracted insights. */
export function InsightEditor({ media, onClose, onSaved }: Props) {
  const insight = media.insight;
  const [summary, setSummary] = useState(insight?.summary ?? '');
  const [activity, setActivity] = useState(insight?.activity ?? '');
  const [decisions, setDecisions] = useState((insight?.decisions ?? []).join('\n'));
  const [outcomes, setOutcomes] = useState((insight?.outcomes ?? []).join('\n'));
  const [transcript, setTranscript] = useState(insight?.transcript ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await api.saveInsight(media.id, {
        summary,
        activity: activity || undefined,
        decisions: decisions.split('\n').map((d) => d.trim()).filter(Boolean),
        outcomes: outcomes.split('\n').map((o) => o.trim()).filter(Boolean),
        transcript: transcript || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="panel" style={{ position: 'fixed', inset: '10% 15%', overflow: 'auto', zIndex: 10 }}>
      <h3>
        Review insight — {media.originalName}{' '}
        {insight && (
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            ({insight.provider}
            {insight.model ? `/${insight.model}` : ''}
            {insight.edited ? ', edited' : ''})
          </span>
        )}
      </h3>
      <p className="muted">Summary</p>
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
      <p className="muted">Activity</p>
      <input
        type="text"
        style={{ width: '100%' }}
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
      />
      <p className="muted">Decisions (one per line)</p>
      <textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} />
      <p className="muted">Outcomes (one per line)</p>
      <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
      {media.kind !== 'image' && (
        <>
          <p className="muted">Transcript</p>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </>
      )}
      {error && <p className="error">{error}</p>}
      <div className="toolbar" style={{ marginTop: '1rem', marginBottom: 0 }}>
        <button className="primary" onClick={() => void save()}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
