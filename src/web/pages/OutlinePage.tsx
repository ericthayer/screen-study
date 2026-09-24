import { useCallback, useEffect, useState } from 'react';
import type { CaseStudy, CaseStudyOutline, MediaWithInsight } from '../../shared/types';
import { api } from '../api';

interface Props {
  activeCaseStudyId: string | null;
  onSelectCaseStudy: (id: string) => void;
}

export function OutlinePage({ activeCaseStudyId, onSelectCaseStudy }: Props) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [outline, setOutline] = useState<CaseStudyOutline | null>(null);
  const [media, setMedia] = useState<MediaWithInsight[]>([]);
  const [title, setTitle] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refreshStudies = useCallback(async () => {
    const { caseStudies } = await api.listCaseStudies();
    setCaseStudies(caseStudies);
  }, []);

  const refreshOutline = useCallback(async (id: string) => {
    const { outline } = await api.getOutline(id);
    setOutline(outline);
  }, []);

  useEffect(() => {
    void refreshStudies();
    void api.listMedia().then(({ items }) => setMedia(items));
  }, [refreshStudies]);

  useEffect(() => {
    if (activeCaseStudyId) void refreshOutline(activeCaseStudyId);
  }, [activeCaseStudyId, refreshOutline]);

  const create = async () => {
    if (!title.trim()) return;
    setError(null);
    try {
      const { caseStudy } = await api.createCaseStudy(title.trim(), weekStart || undefined);
      await refreshStudies();
      setTitle('');
      onSelectCaseStudy(caseStudy.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const assignedIds = new Set(outline?.sections.flatMap((s) => s.mediaIds) ?? []);
  const unassigned = media.filter((m) => m.status === 'analyzed' && !assignedIds.has(m.id));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const move = async (sectionId: string, mediaId: string) => {
    await api.assignMedia(sectionId, mediaId);
    if (activeCaseStudyId) await refreshOutline(activeCaseStudyId);
  };

  const remove = async (sectionId: string, mediaId: string) => {
    await api.unassignMedia(sectionId, mediaId);
    if (activeCaseStudyId) await refreshOutline(activeCaseStudyId);
  };

  return (
    <div>
      <div className="panel">
        <h3>New case study</h3>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Title (e.g. Checkout redesign)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <button className="primary" onClick={() => void create()}>
            Create
          </button>
        </div>
      </div>

      <div className="toolbar">
        {caseStudies.map((cs) => (
          <button
            key={cs.id}
            className={cs.id === activeCaseStudyId ? 'active' : ''}
            onClick={() => onSelectCaseStudy(cs.id)}
          >
            {cs.title}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {outline && (
        <>
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>{outline.title}</h2>
            {outline.weekStart && <span className="muted">week of {outline.weekStart}</span>}
            <button
              className="primary"
              onClick={() =>
                void api.autoOrganize(outline.id).then(({ outline }) => setOutline(outline))
              }
            >
              Auto-organize
            </button>
          </div>

          {outline.gaps.length > 0 && (
            <div className="panel">
              <h3>Gaps</h3>
              {outline.gaps.map((gap, i) => (
                <p key={i} className="gap">
                  ⚠ {gap.message}
                </p>
              ))}
            </div>
          )}

          {outline.sections.map((section) => (
            <div key={section.id} className="panel">
              <h3>{section.title}</h3>
              <div className="section-media">
                {section.mediaIds.length === 0 && (
                  <span className="muted">No media assigned yet.</span>
                )}
                {section.mediaIds.map((mediaId) => {
                  const item = mediaById.get(mediaId);
                  return (
                    <span key={mediaId} className="chip">
                      {item?.originalName ?? mediaId}
                      <button onClick={() => void remove(section.id, mediaId)} title="Remove">
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
              {unassigned.length > 0 && (
                <div className="row">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) void move(section.id, e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="" disabled>
                      Add analyzed media…
                    </option>
                    {unassigned.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.originalName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
