import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server/app.js';
import type { JobRunner } from '../src/server/services/jobs.js';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Access the app context (decorated by buildApp for tests/operations). */
function ctx(app: FastifyInstance) {
  return (app as unknown as { ctx: { jobs: JobRunner } }).ctx;
}

describe('ScreenStudy API (end-to-end pipeline)', () => {
  let app: FastifyInstance;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'screen-study-test-'));
    app = await buildApp({
      configOverrides: {
        dataDir,
        dbPath: path.join(dataDir, 'test.db'),
        mediaDir: path.join(dataDir, 'media'),
        publishDir: path.join(dataDir, 'published'),
        aiProvider: 'local',
        jobPollMs: 50,
      },
      serveWeb: false,
      startJobRunner: false,
    });
  });

  afterEach(async () => {
    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('reports health with the local provider', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', provider: 'local' });
  });

  it('uploads media, detects kind, and lists it', async () => {
    const boundary = '----testboundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="shot.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      PNG_1PX,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.statusCode).toBe(201);
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ originalName: 'shot.png', kind: 'image', status: 'uploaded' });

    const list = await app.inject({ method: 'GET', url: '/api/media' });
    expect(list.json().items).toHaveLength(1);
  });

  it('rejects unsupported file types', async () => {
    const boundary = '----testboundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="evil.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ),
      Buffer.from('MZ'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.statusCode).toBe(415);
  });

  async function uploadPng(name = 'shot.png'): Promise<string> {
    const boundary = '----testboundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      PNG_1PX,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    return res.json().items[0].id as string;
  }

  it('runs the full pipeline: upload → analyze → organize → generate → publish → unpublish', async () => {
    const mediaId = await uploadPng();

    // Analyze (job runner; local provider completes without network).
    const analyze = await app.inject({ method: 'POST', url: `/api/media/${mediaId}/analyze` });
    expect(analyze.statusCode).toBe(202);
    expect(analyze.json().job.status).toBe('pending');
    await ctx(app).jobs.drain();
    const analyzed = await app.inject({ method: 'GET', url: `/api/media/${mediaId}` });
    expect(analyzed.json().item.status).toBe('analyzed');
    expect(analyzed.json().item.insight.summary).toContain('shot.png');
    expect(analyzed.json().item.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // Human edit of the insight.
    const edit = await app.inject({
      method: 'PUT',
      url: `/api/insights/${mediaId}`,
      payload: { summary: 'Settings page redesign exploration', decisions: ['Chose a two-column layout'] },
    });
    expect(edit.statusCode).toBe(200);
    expect(edit.json().insight.edited).toBe(true);

    // Case study + auto-organize (decisions present → "decisions" section).
    const cs = await app.inject({
      method: 'POST',
      url: '/api/case-studies',
      payload: { title: 'Checkout Redesign', weekStart: '2026-08-03' },
    });
    expect(cs.statusCode).toBe(201);
    const caseStudyId = cs.json().caseStudy.id as string;

    const organized = await app.inject({
      method: 'POST',
      url: `/api/case-studies/${caseStudyId}/auto-organize`,
    });
    const outline = organized.json().outline;
    const decisions = outline.sections.find((s: { sectionKey: string }) => s.sectionKey === 'decisions');
    expect(decisions.mediaIds).toContain(mediaId);
    // Gaps: problem/process/outcomes have no media.
    expect(outline.gaps.length).toBeGreaterThan(0);

    // Generate a draft (async job → draft id on completion).
    const gen = await app.inject({ method: 'POST', url: `/api/case-studies/${caseStudyId}/generate` });
    expect(gen.statusCode).toBe(202);
    await ctx(app).jobs.drain();
    const genJob = (await app.inject({ method: 'GET', url: `/api/analysis/jobs/${gen.json().job.id}` }))
      .json().job;
    expect(genJob.status).toBe('done');
    expect(genJob.draftId).toBeTruthy();
    const draft = (await app.inject({ method: 'GET', url: `/api/drafts/${genJob.draftId}` })).json().draft;
    expect(draft.version).toBe(1);
    expect(draft.markdown).toContain('---');
    expect(draft.markdown).toContain('Checkout Redesign');

    // Edit creates version 2.
    const v2 = await app.inject({
      method: 'PATCH',
      url: `/api/drafts/${draft.id}`,
      payload: { markdown: draft.markdown + '\n\nExtra paragraph.' },
    });
    expect(v2.json().draft.version).toBe(2);
    const drafts = await app.inject({ method: 'GET', url: `/api/case-studies/${caseStudyId}/drafts` });
    expect(drafts.json().drafts).toHaveLength(2);

    // Export.
    const exported = await app.inject({ method: 'GET', url: `/api/drafts/${draft.id}/export` });
    expect(exported.headers['content-type']).toContain('text/markdown');

    // Publish to the filesystem target.
    const pub = await app.inject({ method: 'POST', url: `/api/drafts/${draft.id}/publish` });
    expect(pub.statusCode).toBe(201);
    const record = pub.json().record;
    expect(record.status).toBe('published');
    const articlePath = path.join(record.path as string, 'index.md');
    expect(existsSync(articlePath)).toBe(true);
    expect(readFileSync(articlePath, 'utf8')).toContain('draft: false');

    // Unpublish removes the output.
    const unpub = await app.inject({ method: 'POST', url: `/api/publish/${record.id}/unpublish` });
    expect(unpub.json().record.status).toBe('unpublished');
    expect(existsSync(record.path as string)).toBe(false);
  });

  it('persists uploads to the media dir and deletes them', async () => {
    const mediaId = await uploadPng();
    const res = await app.inject({ method: 'GET', url: `/api/media/${mediaId}` });
    const filename = res.json().item.filename as string;
    expect(existsSync(path.join(dataDir, 'media', filename))).toBe(true);

    const del = await app.inject({ method: 'DELETE', url: `/api/media/${mediaId}` });
    expect(del.statusCode).toBe(204);
    expect(existsSync(path.join(dataDir, 'media', filename))).toBe(false);
  });

  it('serves the same API under /api/v1', async () => {
    const health = await app.inject({ method: 'GET', url: '/api/v1/api/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: 'ok', provider: 'local' });

    const list = await app.inject({ method: 'GET', url: '/api/v1/api/media' });
    expect(list.statusCode).toBe(200);
  });

  it('dedupes uploads by content hash', async () => {
    const first = await uploadPng('a.png');
    const boundary = '----testboundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="b.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      PNG_1PX,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().items).toHaveLength(0);
    expect(res.json().duplicates).toHaveLength(1);
    expect(res.json().duplicates[0].id).toBe(first);

    const list = await app.inject({ method: 'GET', url: '/api/media' });
    expect(list.json().items).toHaveLength(1);
  });

  it('rejects files whose bytes do not match a media signature', async () => {
    const boundary = '----testboundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fake.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      Buffer.from('MZ this is not a png'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.statusCode).toBe(415);

    const list = await app.inject({ method: 'GET', url: '/api/media' });
    expect(list.json().items).toHaveLength(0);
  });

  it('exposes insight via the analysis alias endpoint', async () => {
    const mediaId = await uploadPng();
    await app.inject({ method: 'POST', url: `/api/media/${mediaId}/analyze` });
    await ctx(app).jobs.drain();
    const res = await app.inject({ method: 'GET', url: `/api/media/${mediaId}/analysis` });
    expect(res.statusCode).toBe(200);
    expect(res.json().insight.summary).toContain('shot.png');
  });

  it('retries a failed analysis job via the retry alias', async () => {
    const mediaId = await uploadPng();
    const job = (await app.inject({ method: 'POST', url: `/api/media/${mediaId}/analyze` })).json().job;

    // Force a failure by deleting the underlying file, then run the job.
    const filename = (await app.inject({ method: 'GET', url: `/api/media/${mediaId}` })).json().item
      .filename as string;
    rmSync(path.join(dataDir, 'media', filename), { force: true });
    // Exhaust retries (bypass backoff gating so this runs instantly).
    for (let i = 0; i < 3; i++) await ctx(app).jobs.drain(200, true);
    const failed = (await app.inject({ method: 'GET', url: `/api/analysis/jobs/${job.id}` })).json().job;
    expect(failed.status).toBe('failed');

    // Retry via the alias creates a fresh pending job.
    const retry = await app.inject({ method: 'POST', url: `/api/analysis/jobs/${job.id}/retry` });
    expect(retry.statusCode).toBe(202);
    expect(retry.json().job.status).toBe('pending');
  });

  it('previews a publish via dry-run without writing', async () => {
    const mediaId = await uploadPng();
    await app.inject({ method: 'POST', url: `/api/media/${mediaId}/analyze` });
    await ctx(app).jobs.drain();
    await app.inject({
      method: 'PUT',
      url: `/api/insights/${mediaId}`,
      payload: { summary: 'x', decisions: ['d'] },
    });
    const cs = await app.inject({
      method: 'POST',
      url: '/api/case-studies',
      payload: { title: 'Dry Run Study' },
    });
    const caseStudyId = cs.json().caseStudy.id as string;
    await app.inject({ method: 'POST', url: `/api/case-studies/${caseStudyId}/auto-organize` });
    const gen = await app.inject({ method: 'POST', url: `/api/case-studies/${caseStudyId}/generate` });
    await ctx(app).jobs.drain();
    const job = (await app.inject({ method: 'GET', url: `/api/analysis/jobs/${gen.json().job.id}` })).json().job;

    const dry = await app.inject({ method: 'POST', url: `/api/drafts/${job.draftId}/publish/dry-run` });
    expect(dry.statusCode).toBe(200);
    expect(dry.json().target).toBe('filesystem');
    expect(dry.json().bundle.slug).toBe('dry-run-study');
    expect(existsSync(path.join(dataDir, 'published', 'dry-run-study'))).toBe(false);
  });
});
