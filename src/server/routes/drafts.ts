import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { generateDraft } from '../services/article.js';
import { publishDraft, unpublishDraft } from '../services/publish.js';

export function registerDraftRoutes(app: FastifyInstance, ctx: AppContext): void {
  // One-click draft generation for a case study.
  app.post<{ Params: { id: string } }>(
    '/api/case-studies/:id/generate',
    async (request, reply) => {
      const study = ctx.db.getCaseStudy(request.params.id);
      if (!study) return reply.status(404).send({ error: 'Not found' });
      const draft = await generateDraft(ctx.db, ctx.ai, study.id);
      return reply.status(201).send({ draft });
    },
  );

  app.get<{ Params: { id: string } }>('/api/case-studies/:id/drafts', async (request, reply) => {
    const study = ctx.db.getCaseStudy(request.params.id);
    if (!study) return reply.status(404).send({ error: 'Not found' });
    return { drafts: ctx.db.listDrafts(study.id) };
  });

  app.get<{ Params: { id: string } }>('/api/drafts/:id', async (request, reply) => {
    const draft = ctx.db.getDraft(request.params.id);
    if (!draft) return reply.status(404).send({ error: 'Not found' });
    return { draft, publishRecords: ctx.db.listPublishRecords(draft.id) };
  });

  // Export the canonical Markdown (with frontmatter).
  app.get<{ Params: { id: string } }>('/api/drafts/:id/export', async (request, reply) => {
    const draft = ctx.db.getDraft(request.params.id);
    if (!draft) return reply.status(404).send({ error: 'Not found' });
    return reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="${draft.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-v${draft.version}.md"`,
      )
      .send(draft.markdown);
  });

  // Review/edit a draft. Editing markdown creates the next version to preserve history.
  app.patch<{
    Params: { id: string };
    Body: { title?: string; markdown?: string; status?: 'draft' | 'review' | 'published' };
  }>('/api/drafts/:id', async (request, reply) => {
    const draft = ctx.db.getDraft(request.params.id);
    if (!draft) return reply.status(404).send({ error: 'Not found' });
    if (request.body?.markdown && request.body.markdown !== draft.markdown) {
      const next = ctx.db.createDraft({
        caseStudyId: draft.caseStudyId,
        title: request.body.title ?? draft.title,
        markdown: request.body.markdown,
        provider: draft.provider,
      });
      if (request.body.status) ctx.db.updateDraft(next.id, { status: request.body.status });
      return { draft: ctx.db.getDraft(next.id) };
    }
    const updated = ctx.db.updateDraft(draft.id, request.body ?? {});
    return { draft: updated };
  });

  // Publishing.
  app.post<{ Params: { id: string } }>('/api/drafts/:id/publish', async (request, reply) => {
    const draft = ctx.db.getDraft(request.params.id);
    if (!draft) return reply.status(404).send({ error: 'Not found' });
    const record = publishDraft(ctx.db, ctx.config, draft.id);
    const status = record.status === 'published' ? 201 : 500;
    return reply.status(status).send({ record });
  });

  app.post<{ Params: { recordId: string } }>(
    '/api/publish/:recordId/unpublish',
    async (request, reply) => {
      try {
        const record = unpublishDraft(ctx.db, ctx.config, request.params.recordId);
        return { record };
      } catch {
        return reply.status(404).send({ error: 'Not found' });
      }
    },
  );
}
