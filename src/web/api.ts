import type {
  AnalysisJob,
  ArticleDraft,
  CaseStudy,
  CaseStudyOutline,
  Insight,
  MediaWithInsight,
  PublishRecord,
} from '../shared/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((body as { error?: string }).error ?? response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function json<T>(url: string, method: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  uploadMedia(files: File[]): Promise<{ items: MediaWithInsight[] }> {
    const form = new FormData();
    for (const file of files) form.append('file', file);
    return request('/api/media', { method: 'POST', body: form });
  },
  listMedia: () => request<{ items: MediaWithInsight[] }>('/api/media'),
  deleteMedia: (id: string) => request<void>(`/api/media/${id}`, { method: 'DELETE' }),
  analyzeMedia: (id: string) =>
    json<{ job: AnalysisJob }>(`/api/media/${id}/analyze`, 'POST'),
  analyzeAll: () => json<{ jobs: AnalysisJob[] }>('/api/analysis/batch', 'POST', {}),
  listJobs: () => request<{ jobs: AnalysisJob[] }>('/api/analysis/jobs'),
  saveInsight: (mediaId: string, insight: Partial<Insight>) =>
    json<{ insight: Insight }>(`/api/insights/${mediaId}`, 'PUT', insight),

  createCaseStudy: (title: string, weekStart?: string) =>
    json<{ caseStudy: CaseStudy }>('/api/case-studies', 'POST', { title, weekStart }),
  listCaseStudies: () => request<{ caseStudies: CaseStudy[] }>('/api/case-studies'),
  getOutline: (id: string) => request<{ outline: CaseStudyOutline }>(`/api/case-studies/${id}`),
  autoOrganize: (id: string) =>
    json<{ outline: CaseStudyOutline }>(`/api/case-studies/${id}/auto-organize`, 'POST'),
  assignMedia: (sectionId: string, mediaId: string) =>
    request<void>(`/api/sections/${sectionId}/media/${mediaId}`, { method: 'PUT' }),
  unassignMedia: (sectionId: string, mediaId: string) =>
    request<void>(`/api/sections/${sectionId}/media/${mediaId}`, { method: 'DELETE' }),

  generateDraft: (caseStudyId: string) =>
    json<{ draft: ArticleDraft }>(`/api/case-studies/${caseStudyId}/generate`, 'POST'),
  listDrafts: (caseStudyId: string) =>
    request<{ drafts: ArticleDraft[] }>(`/api/case-studies/${caseStudyId}/drafts`),
  getDraft: (id: string) =>
    request<{ draft: ArticleDraft; publishRecords: PublishRecord[] }>(`/api/drafts/${id}`),
  updateDraft: (id: string, patch: Partial<Pick<ArticleDraft, 'title' | 'markdown' | 'status'>>) =>
    json<{ draft: ArticleDraft }>(`/api/drafts/${id}`, 'PATCH', patch),
  publishDraft: (id: string) => json<{ record: PublishRecord }>(`/api/drafts/${id}/publish`, 'POST'),
  unpublish: (recordId: string) =>
    json<{ record: PublishRecord }>(`/api/publish/${recordId}/unpublish`, 'POST'),
};
