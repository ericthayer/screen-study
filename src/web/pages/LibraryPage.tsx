import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaWithInsight } from '../../shared/types';
import { api } from '../api';
import { InsightEditor } from '../components/InsightEditor';

export function LibraryPage() {
  const [items, setItems] = useState<MediaWithInsight[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<MediaWithInsight | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const { items } = await api.listMedia();
    setItems(items);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any analysis is in flight.
  useEffect(() => {
    if (!items.some((i) => i.status === 'analyzing')) return;
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [items, refresh]);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadMedia(files);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const analyze = async (id: string) => {
    setError(null);
    try {
      await api.analyzeMedia(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    await api.deleteMedia(id);
    await refresh();
  };

  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(Array.from(e.dataTransfer.files));
        }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        {busy ? 'Uploading…' : 'Drop screenshots, recordings, or audio here — or click to browse'}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="image/*,video/*,audio/*"
          onChange={(e) => void upload(Array.from(e.target.files ?? []))}
        />
      </div>

      <div className="toolbar">
        <button
          className="primary"
          onClick={() =>
            void api
              .analyzeAll()
              .then(refresh)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
          }
        >
          Analyze all unanalyzed
        </button>
        <span className="muted">{items.length} item(s)</span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="media-grid">
        {items.map((item) => (
          <div key={item.id} className="media-card">
            {item.kind === 'image' ? (
              <img src={`/files/${item.filename}`} alt={item.originalName} loading="lazy" />
            ) : item.kind === 'video' ? (
              <video src={`/files/${item.filename}`} controls preload="metadata" />
            ) : (
              <div className="placeholder">🎙</div>
            )}
            <div className="body">
              <div className="name" title={item.originalName}>
                {item.originalName}
              </div>
              <span className={`badge ${item.status}`}>{item.status}</span>{' '}
              <span className="badge">{item.kind}</span>
              {item.insight && (
                <p className="muted" style={{ fontSize: '0.8rem' }}>
                  {item.insight.summary}
                </p>
              )}
              <div className="actions">
                <button onClick={() => void analyze(item.id)} disabled={item.status === 'analyzing'}>
                  {item.insight ? 'Re-analyze' : 'Analyze'}
                </button>
                <button onClick={() => setEditing(item)}>Review</button>
                <button className="danger" onClick={() => void remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <InsightEditor
          media={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
