import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

export function registerDraftRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Draft generation for a case study. Generation is a multi-second AI call,
  // so it runs as a background job (ADR-002 rule 4 / ADR-004), not in the
  // request handler: the response is 202 + job, and the created draft id is
  // attached to the job when it completes.
  app.post<{ Params: { id: string } }>(
    '/api/case-studies/:id/generate',
    async (request, reply) => {
      const study = ctx.db.getCaseStudy(request.params.id);
      if (!study) return reply.status(404).send({ error: 'Not found' });
      const job = ctx.db.createDraftJob(study.id);
      return reply.status(202).send({ job });
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

  // Publishing via the PublishingAdapter seam (ADR-010).
  app.post<{ Params: { id: string } }>('/api/drafts/:id/publish', async (request, reply) => {
    const draft = ctx.db.getDraft(request.params.id);
    if (!draft) return reply.status(404).send({ error: 'Not found' });
    try {
      const result = ctx.publisher.publish(ctx.db, draft.id);
      const record = ctx.db.createPublishRecord({
        draftId: draft.id,
        target: ctx.publisher.target,
        status: 'published',
        path: result.location,
      });
      ctx.db.updateDraft(draft.id, { status: 'published' });
      return reply.status(201).send({ record });
    } catch (error) {
      const record = ctx.db.createPublishRecord({
        draftId: draft.id,
        target: ctx.publisher.target,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return reply.status(500).send({ record });
    }
  });

  // Dry-run preview of a publish (spec: POST /drafts/{id}/publish/dry-run).
  app.post<{ Params: { id: string } }>(
    '/api/drafts/:id/publish/dry-run',
    async (request, reply) => {
      const draft = ctx.db.getDraft(request.params.id);
      if (!draft) return reply.status(404).send({ error: 'Not found' });
      try {
        const bundle = ctx.publisher.dryRun(ctx.db, draft.id);
        return { target: ctx.publisher.target, bundle };
      } catch (error) {
        return reply
          .status(500)
          .send({ error: error instanceof Error ? error.message : String(error) });
      }
    },
  );

  app.post<{ Params: { recordId: string } }>(
    '/api/publish/:recordId/unpublish',
    async (request, reply) => {
      const record = ctx.db.getPublishRecord(request.params.recordId);
      if (!record) return reply.status(404).send({ error: 'Not found' });
      ctx.publisher.retract(record);
      ctx.db.markUnpublished(record.id);
      return { record: ctx.db.getPublishRecord(record.id) };
    },
  );
}
