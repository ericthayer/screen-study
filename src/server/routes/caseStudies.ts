import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { autoOrganize, getOutline } from '../services/organize.js';

export function registerCaseStudyRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Body: { title?: string; weekStart?: string } }>(
    '/api/case-studies',
    async (request, reply) => {
      const title = request.body?.title?.trim();
      if (!title) return reply.status(400).send({ error: 'title is required' });
      const study = ctx.db.createCaseStudy({ title, weekStart: request.body?.weekStart ?? null });
      return reply.status(201).send({ caseStudy: study });
    },
  );

  app.get(
    '/api/case-studies',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async () => {
      return { caseStudies: ctx.db.listCaseStudies() };
    },
  );

  app.get<{ Params: { id: string } }>('/api/case-studies/:id', async (request, reply) => {
    const study = ctx.db.getCaseStudy(request.params.id);
    if (!study) return reply.status(404).send({ error: 'Not found' });
    return { outline: getOutline(ctx.db, study.id) };
  });

  // Auto-organize unassigned analyzed media into sections.
  app.post<{ Params: { id: string } }>(
    '/api/case-studies/:id/auto-organize',
    async (request, reply) => {
      const study = ctx.db.getCaseStudy(request.params.id);
      if (!study) return reply.status(404).send({ error: 'Not found' });
      return { outline: autoOrganize(ctx.db, study.id) };
    },
  );

  // Rename a section (manual override).
  app.patch<{ Params: { sectionId: string }; Body: { title?: string } }>(
    '/api/sections/:sectionId',
    async (request, reply) => {
      const title = request.body?.title?.trim();
      if (!title) return reply.status(400).send({ error: 'title is required' });
      ctx.db.renameSection(request.params.sectionId, title);
      return reply.status(204).send();
    },
  );

  // Move a media item into a section (manual override).
  app.put<{ Params: { sectionId: string; mediaId: string } }>(
    '/api/sections/:sectionId/media/:mediaId',
    async (request, reply) => {
      if (!ctx.db.getMediaItem(request.params.mediaId)) {
        return reply.status(404).send({ error: 'Media not found' });
      }
      ctx.db.assignMediaToSection(request.params.sectionId, request.params.mediaId);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: { sectionId: string; mediaId: string } }>(
    '/api/sections/:sectionId/media/:mediaId',
    async (request, reply) => {
      ctx.db.removeMediaFromSection(request.params.sectionId, request.params.mediaId);
      return reply.status(204).send();
    },
  );
}
