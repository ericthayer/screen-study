/** Shared domain types used by both the server and the web client. */

export type MediaKind = 'image' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  contentHash: string;
  durationSeconds: number | null;
  capturedAt: string | null;
  source: string | null;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  mediaId: string;
  summary: string;
  activity: string | null;
  decisions: string[];
  outcomes: string[];
  extractedText: string | null;
  transcript: string | null;
  provider: string;
  model: string | null;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaWithInsight extends MediaItem {
  insight: Insight | null;
}

export type SectionKey = 'problem' | 'process' | 'decisions' | 'outcomes';

export const SECTION_KEYS: SectionKey[] = ['problem', 'process', 'decisions', 'outcomes'];

export const SECTION_LABELS: Record<SectionKey, string> = {
  problem: 'Problem',
  process: 'Process',
  decisions: 'Decisions',
  outcomes: 'Outcomes',
};

export interface CaseStudy {
  id: string;
  title: string;
  weekStart: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudySection {
  id: string;
  caseStudyId: string;
  sectionKey: SectionKey;
  title: string;
  position: number;
  mediaIds: string[];
}

export interface CaseStudyOutline extends CaseStudy {
  sections: CaseStudySection[];
  gaps: Gap[];
}

export interface Gap {
  sectionKey: SectionKey;
  message: string;
}

export type DraftStatus = 'draft' | 'review' | 'published';

export interface ArticleDraft {
  id: string;
  caseStudyId: string;
  version: number;
  title: string;
  markdown: string;
  status: DraftStatus;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublishStatus = 'unpublished' | 'published' | 'failed';

export interface PublishRecord {
  id: string;
  draftId: string;
  target: string;
  status: PublishStatus;
  path: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  error: string | null;
}

export type JobKind = 'analysis' | 'draft';

export interface AnalysisJob {
  id: string;
  kind: JobKind;
  mediaId: string | null;
  caseStudyId: string | null;
  draftId: string | null;
  status: 'pending' | 'running' | 'done' | 'failed';
  attempts: number;
  maxAttempts: number;
  runAt: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
