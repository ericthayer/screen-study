import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  AnalysisJob,
  ArticleDraft,
  CaseStudy,
  CaseStudySection,
  Insight,
  MediaItem,
  MediaWithInsight,
  PublishRecord,
  SectionKey,
} from '../shared/types.js';
import { SECTION_KEYS, SECTION_LABELS } from '../shared/types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video','audio')),
  size_bytes INTEGER NOT NULL,
  content_hash TEXT,
  duration_seconds REAL,
  captured_at TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','analyzing','analyzed','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL UNIQUE REFERENCES media_items(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  activity TEXT,
  decisions TEXT NOT NULL DEFAULT '[]',
  outcomes TEXT NOT NULL DEFAULT '[]',
  extracted_text TEXT,
  transcript TEXT,
  provider TEXT NOT NULL DEFAULT 'local',
  model TEXT,
  edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_studies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  week_start TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_study_sections (
  id TEXT PRIMARY KEY,
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL CHECK (section_key IN ('problem','process','decisions','outcomes')),
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (case_study_id, section_key)
);

CREATE TABLE IF NOT EXISTS section_media (
  section_id TEXT NOT NULL REFERENCES case_study_sections(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (section_id, media_id)
);

CREATE TABLE IF NOT EXISTS article_drafts (
  id TEXT PRIMARY KEY,
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
  provider TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (case_study_id, version)
);

CREATE TABLE IF NOT EXISTS publish_records (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES article_drafts(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unpublished','published','failed')),
  path TEXT,
  published_at TEXT,
  unpublished_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'analysis' CHECK (kind IN ('analysis','draft')),
  media_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
  case_study_id TEXT REFERENCES case_studies(id) ON DELETE CASCADE,
  draft_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Lightweight migrations for databases created before a column existed.
const MIGRATIONS = [
  `ALTER TABLE media_items ADD COLUMN content_hash TEXT`,
  `ALTER TABLE analysis_jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'analysis'`,
  `ALTER TABLE analysis_jobs ADD COLUMN case_study_id TEXT REFERENCES case_studies(id) ON DELETE CASCADE`,
  `ALTER TABLE analysis_jobs ADD COLUMN draft_id TEXT`,
  `ALTER TABLE analysis_jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE analysis_jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3`,
  `ALTER TABLE analysis_jobs ADD COLUMN run_at TEXT NOT NULL DEFAULT (datetime('now'))`,
];

interface MediaRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  kind: MediaItem['kind'];
  size_bytes: number;
  content_hash: string | null;
  duration_seconds: number | null;
  captured_at: string | null;
  source: string | null;
  status: MediaItem['status'];
  created_at: string;
  updated_at: string;
}

interface InsightRow {
  id: string;
  media_id: string;
  summary: string;
  activity: string | null;
  decisions: string;
  outcomes: string;
  extracted_text: string | null;
  transcript: string | null;
  provider: string;
  model: string | null;
  edited: number;
  created_at: string;
  updated_at: string;
}

function rowToMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    kind: row.kind,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash ?? '',
    durationSeconds: row.duration_seconds,
    capturedAt: row.captured_at,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToInsight(row: InsightRow): Insight {
  return {
    id: row.id,
    mediaId: row.media_id,
    summary: row.summary,
    activity: row.activity,
    decisions: JSON.parse(row.decisions) as string[],
    outcomes: JSON.parse(row.outcomes) as string[],
    extractedText: row.extracted_text,
    transcript: row.transcript,
    provider: row.provider,
    model: row.model,
    edited: row.edited === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface JobRow {
  id: string;
  kind: AnalysisJob['kind'];
  media_id: string | null;
  case_study_id: string | null;
  draft_id: string | null;
  status: AnalysisJob['status'];
  attempts: number;
  max_attempts: number;
  run_at: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToJob(row: JobRow): AnalysisJob {
  return {
    id: row.id,
    kind: row.kind,
    mediaId: row.media_id,
    caseStudyId: row.case_study_id,
    draftId: row.draft_id,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    runAt: row.run_at,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ScreenStudyDb {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);
    for (const statement of MIGRATIONS) {
      try {
        this.db.exec(statement);
      } catch {
        // Column already exists — migration already applied.
      }
    }
  }

  close(): void {
    this.db.close();
  }

  // ---- Media ----

  createMediaItem(input: {
    filename: string;
    originalName: string;
    mimeType: string;
    kind: MediaItem['kind'];
    sizeBytes: number;
    contentHash?: string | null;
    durationSeconds?: number | null;
    capturedAt?: string | null;
    source?: string | null;
  }): MediaItem {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO media_items (id, filename, original_name, mime_type, kind, size_bytes, content_hash, duration_seconds, captured_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.filename,
        input.originalName,
        input.mimeType,
        input.kind,
        input.sizeBytes,
        input.contentHash ?? null,
        input.durationSeconds ?? null,
        input.capturedAt ?? null,
        input.source ?? null,
      );
    return this.getMediaItem(id)!;
  }

  findMediaByHash(contentHash: string): MediaItem | null {
    const row = this.db
      .prepare('SELECT * FROM media_items WHERE content_hash = ? ORDER BY created_at ASC LIMIT 1')
      .get(contentHash) as MediaRow | undefined;
    return row ? rowToMedia(row) : null;
  }

  getMediaItem(id: string): MediaItem | null {
    const row = this.db.prepare('SELECT * FROM media_items WHERE id = ?').get(id) as
      | MediaRow
      | undefined;
    return row ? rowToMedia(row) : null;
  }

  listMediaItems(): MediaWithInsight[] {
    const rows = this.db
      .prepare('SELECT * FROM media_items ORDER BY created_at DESC')
      .all() as MediaRow[];
    return rows.map((row) => ({
      ...rowToMedia(row),
      insight: this.getInsightByMedia(row.id),
    }));
  }

  updateMediaStatus(id: string, status: MediaItem['status']): void {
    this.db
      .prepare(`UPDATE media_items SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, id);
  }

  updateMediaItem(
    id: string,
    patch: Partial<Pick<MediaItem, 'durationSeconds' | 'capturedAt' | 'source'>>,
  ): MediaItem | null {
    const existing = this.getMediaItem(id);
    if (!existing) return null;
    this.db
      .prepare(
        `UPDATE media_items SET duration_seconds = ?, captured_at = ?, source = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        patch.durationSeconds ?? existing.durationSeconds,
        patch.capturedAt ?? existing.capturedAt,
        patch.source ?? existing.source,
        id,
      );
    return this.getMediaItem(id);
  }

  deleteMediaItem(id: string): MediaItem | null {
    const item = this.getMediaItem(id);
    if (!item) return null;
    this.db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    return item;
  }

  // ---- Insights ----

  upsertInsight(input: {
    mediaId: string;
    summary: string;
    activity?: string | null;
    decisions?: string[];
    outcomes?: string[];
    extractedText?: string | null;
    transcript?: string | null;
    provider: string;
    model?: string | null;
    edited?: boolean;
  }): Insight {
    const existing = this.getInsightByMedia(input.mediaId);
    if (existing) {
      this.db
        .prepare(
          `UPDATE insights SET summary = ?, activity = ?, decisions = ?, outcomes = ?, extracted_text = ?, transcript = ?,
             provider = ?, model = ?, edited = ?, updated_at = datetime('now')
           WHERE media_id = ?`,
        )
        .run(
          input.summary,
          input.activity ?? null,
          JSON.stringify(input.decisions ?? []),
          JSON.stringify(input.outcomes ?? []),
          input.extractedText ?? null,
          input.transcript ?? null,
          input.provider,
          input.model ?? null,
          input.edited ? 1 : 0,
          input.mediaId,
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO insights (id, media_id, summary, activity, decisions, outcomes, extracted_text, transcript, provider, model, edited)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          input.mediaId,
          input.summary,
          input.activity ?? null,
          JSON.stringify(input.decisions ?? []),
          JSON.stringify(input.outcomes ?? []),
          input.extractedText ?? null,
          input.transcript ?? null,
          input.provider,
          input.model ?? null,
          input.edited ? 1 : 0,
        );
    }
    return this.getInsightByMedia(input.mediaId)!;
  }

  getInsightByMedia(mediaId: string): Insight | null {
    const row = this.db.prepare('SELECT * FROM insights WHERE media_id = ?').get(mediaId) as
      | InsightRow
      | undefined;
    return row ? rowToInsight(row) : null;
  }

  // ---- Case studies & sections ----

  createCaseStudy(input: { title: string; weekStart?: string | null }): CaseStudy {
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO case_studies (id, title, week_start) VALUES (?, ?, ?)')
      .run(id, input.title, input.weekStart ?? null);
    const sectionStmt = this.db.prepare(
      'INSERT INTO case_study_sections (id, case_study_id, section_key, title, position) VALUES (?, ?, ?, ?, ?)',
    );
    SECTION_KEYS.forEach((key, index) => {
      sectionStmt.run(randomUUID(), id, key, SECTION_LABELS[key], index);
    });
    return this.getCaseStudy(id)!;
  }

  getCaseStudy(id: string): CaseStudy | null {
    const row = this.db.prepare('SELECT * FROM case_studies WHERE id = ?').get(id) as
      | {
          id: string;
          title: string;
          week_start: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      weekStart: row.week_start,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listCaseStudies(): CaseStudy[] {
    const rows = this.db
      .prepare('SELECT id FROM case_studies ORDER BY created_at DESC')
      .all() as { id: string }[];
    return rows.map((r) => this.getCaseStudy(r.id)!);
  }

  getSections(caseStudyId: string): CaseStudySection[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM case_study_sections WHERE case_study_id = ? ORDER BY position ASC',
      )
      .all(caseStudyId) as {
      id: string;
      case_study_id: string;
      section_key: SectionKey;
      title: string;
      position: number;
    }[];
    return rows.map((row) => {
      const media = this.db
        .prepare(
          'SELECT media_id FROM section_media WHERE section_id = ? ORDER BY position ASC',
        )
        .all(row.id) as { media_id: string }[];
      return {
        id: row.id,
        caseStudyId: row.case_study_id,
        sectionKey: row.section_key,
        title: row.title,
        position: row.position,
        mediaIds: media.map((m) => m.media_id),
      };
    });
  }

  getSectionByKey(caseStudyId: string, key: SectionKey): CaseStudySection | null {
    return this.getSections(caseStudyId).find((s) => s.sectionKey === key) ?? null;
  }

  renameSection(sectionId: string, title: string): void {
    this.db
      .prepare('UPDATE case_study_sections SET title = ? WHERE id = ?')
      .run(title, sectionId);
  }

  assignMediaToSection(sectionId: string, mediaId: string): void {
    // A media item can only belong to one section of a case study narrative at a time.
    this.db
      .prepare(
        `DELETE FROM section_media WHERE media_id = ? AND section_id IN
           (SELECT id FROM case_study_sections WHERE case_study_id =
             (SELECT case_study_id FROM case_study_sections WHERE id = ?))`,
      )
      .run(mediaId, sectionId);
    const maxPos = this.db
      .prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM section_media WHERE section_id = ?')
      .get(sectionId) as { max_pos: number };
    this.db
      .prepare(
        'INSERT OR IGNORE INTO section_media (section_id, media_id, position) VALUES (?, ?, ?)',
      )
      .run(sectionId, mediaId, maxPos.max_pos + 1);
  }

  removeMediaFromSection(sectionId: string, mediaId: string): void {
    this.db
      .prepare('DELETE FROM section_media WHERE section_id = ? AND media_id = ?')
      .run(sectionId, mediaId);
  }

  // ---- Article drafts ----

  createDraft(input: {
    caseStudyId: string;
    title: string;
    markdown: string;
    provider?: string | null;
  }): ArticleDraft {
    const latest = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM article_drafts WHERE case_study_id = ?')
      .get(input.caseStudyId) as { v: number };
    const id = randomUUID();
    this.db
      .prepare(
        'INSERT INTO article_drafts (id, case_study_id, version, title, markdown, provider) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.caseStudyId, latest.v + 1, input.title, input.markdown, input.provider ?? null);
    return this.getDraft(id)!;
  }

  getDraft(id: string): ArticleDraft | null {
    const row = this.db.prepare('SELECT * FROM article_drafts WHERE id = ?').get(id) as
      | {
          id: string;
          case_study_id: string;
          version: number;
          title: string;
          markdown: string;
          status: ArticleDraft['status'];
          provider: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      caseStudyId: row.case_study_id,
      version: row.version,
      title: row.title,
      markdown: row.markdown,
      status: row.status,
      provider: row.provider,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listDrafts(caseStudyId: string): ArticleDraft[] {
    const rows = this.db
      .prepare('SELECT id FROM article_drafts WHERE case_study_id = ? ORDER BY version DESC')
      .all(caseStudyId) as { id: string }[];
    return rows.map((r) => this.getDraft(r.id)!);
  }

  updateDraft(
    id: string,
    patch: Partial<Pick<ArticleDraft, 'title' | 'markdown' | 'status'>>,
  ): ArticleDraft | null {
    const existing = this.getDraft(id);
    if (!existing) return null;
    this.db
      .prepare(
        `UPDATE article_drafts SET title = ?, markdown = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        patch.title ?? existing.title,
        patch.markdown ?? existing.markdown,
        patch.status ?? existing.status,
        id,
      );
    return this.getDraft(id);
  }

  // ---- Publishing ----

  createPublishRecord(input: {
    draftId: string;
    target: string;
    status: PublishRecord['status'];
    path?: string | null;
    error?: string | null;
  }): PublishRecord {
    const id = randomUUID();
    const publishedAt = input.status === 'published' ? new Date().toISOString() : null;
    this.db
      .prepare(
        'INSERT INTO publish_records (id, draft_id, target, status, path, published_at, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.draftId, input.target, input.status, input.path ?? null, publishedAt, input.error ?? null);
    return this.getPublishRecord(id)!;
  }

  getPublishRecord(id: string): PublishRecord | null {
    const row = this.db.prepare('SELECT * FROM publish_records WHERE id = ?').get(id) as
      | {
          id: string;
          draft_id: string;
          target: string;
          status: PublishRecord['status'];
          path: string | null;
          published_at: string | null;
          unpublished_at: string | null;
          error: string | null;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      draftId: row.draft_id,
      target: row.target,
      status: row.status,
      path: row.path,
      publishedAt: row.published_at,
      unpublishedAt: row.unpublished_at,
      error: row.error,
    };
  }

  listPublishRecords(draftId: string): PublishRecord[] {
    const rows = this.db
      .prepare('SELECT id FROM publish_records WHERE draft_id = ? ORDER BY published_at DESC')
      .all(draftId) as { id: string }[];
    return rows.map((r) => this.getPublishRecord(r.id)!);
  }

  markUnpublished(id: string): void {
    this.db
      .prepare(
        `UPDATE publish_records SET status = 'unpublished', unpublished_at = ? WHERE id = ?`,
      )
      .run(new Date().toISOString(), id);
  }

  // ---- Jobs (analysis & draft generation) ----

  createAnalysisJob(mediaId: string): AnalysisJob {
    return this.createJob({ kind: 'analysis', mediaId });
  }

  createDraftJob(caseStudyId: string): AnalysisJob {
    return this.createJob({ kind: 'draft', caseStudyId });
  }

  private createJob(input: {
    kind: AnalysisJob['kind'];
    mediaId?: string;
    caseStudyId?: string;
    maxAttempts?: number;
    runAt?: string;
  }): AnalysisJob {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO analysis_jobs (id, kind, media_id, case_study_id, max_attempts, run_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.kind,
        input.mediaId ?? null,
        input.caseStudyId ?? null,
        input.maxAttempts ?? 3,
        input.runAt ?? new Date().toISOString(),
      );
    return this.getAnalysisJob(id)!;
  }

  getAnalysisJob(id: string): AnalysisJob | null {
    const row = this.db.prepare('SELECT * FROM analysis_jobs WHERE id = ?').get(id) as
      | JobRow
      | undefined;
    return row ? rowToJob(row) : null;
  }

  updateAnalysisJob(
    id: string,
    status: AnalysisJob['status'],
    error?: string | null,
    patch: { draftId?: string | null; runAt?: string } = {},
  ): void {
    this.db
      .prepare(
        `UPDATE analysis_jobs SET status = ?, error = ?, draft_id = COALESCE(?, draft_id),
           run_at = COALESCE(?, run_at), updated_at = datetime('now') WHERE id = ?`,
      )
      .run(status, error ?? null, patch.draftId ?? null, patch.runAt ?? null, id);
  }

  /**
   * Claim the next due pending job. The status flip happens inside an
   * immediate transaction so a second worker cannot claim the same row.
   * `ignoreRunAt` bypasses the due-time gate (used by tests to skip backoff).
   */
  claimNextJob(ignoreRunAt = false): AnalysisJob | null {
    const now = new Date().toISOString();
    const claim = this.db.transaction((): string | null => {
      const row = ignoreRunAt
        ? (this.db
            .prepare(
              `SELECT id FROM analysis_jobs WHERE status = 'pending'
               ORDER BY created_at ASC LIMIT 1`,
            )
            .get() as { id: string } | undefined)
        : (this.db
            .prepare(
              `SELECT id FROM analysis_jobs WHERE status = 'pending' AND run_at <= ?
               ORDER BY created_at ASC LIMIT 1`,
            )
            .get(now) as { id: string } | undefined);
      if (!row) return null;
      const changed = this.db
        .prepare(
          `UPDATE analysis_jobs SET status = 'running', attempts = attempts + 1,
             updated_at = datetime('now') WHERE id = ? AND status = 'pending'`,
        )
        .run(row.id);
      return changed.changes === 1 ? row.id : null;
    });
    const id = claim.immediate();
    return id ? this.getAnalysisJob(id) : null;
  }

  /** Mark a claimed job as retryable: failed now, pending again after backoff. */
  rescheduleJob(id: string, error: string, backoffSeconds: number): void {
    const runAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
    this.db
      .prepare(
        `UPDATE analysis_jobs SET status = 'pending', error = ?, run_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(error, runAt, id);
  }

  /** Requeue jobs whose worker died mid-run (crash recovery on startup). */
  requeueStaleJobs(olderThanSeconds: number): number {
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000).toISOString();
    const result = this.db
      .prepare(
        `UPDATE analysis_jobs SET status = 'pending', error = 'Worker restarted while running',
           updated_at = datetime('now')
         WHERE status = 'running' AND updated_at < ?`,
      )
      .run(cutoff);
    return result.changes;
  }

  getLatestDraftJob(caseStudyId: string): AnalysisJob | null {
    const row = this.db
      .prepare(
        `SELECT * FROM analysis_jobs WHERE case_study_id = ? AND kind = 'draft'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(caseStudyId) as JobRow | undefined;
    return row ? rowToJob(row) : null;
  }

  listAnalysisJobs(limit = 50): AnalysisJob[] {
    const rows = this.db
      .prepare('SELECT id FROM analysis_jobs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as { id: string }[];
    return rows.map((r) => this.getAnalysisJob(r.id)!);
  }
}
