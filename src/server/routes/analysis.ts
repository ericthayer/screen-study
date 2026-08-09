import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

export function registerAnalysisRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Analyze a single media item. The job is queued in SQLite and executed by
  // the background job runner (ADR-004) — never inline in the request.
  app.post<{ Params: { id: string } }>('/api/media/:id/analyze', async (request, reply) => {
    const media = ctx.db.getMediaItem(request.params.id);
    if (!media) return reply.status(404).send({ error: 'Not found' });
    const job = ctx.db.createAnalysisJob(media.id);
    return reply.status(202).send({ job });
  });

  // Batch analyze: all uploaded (not yet analyzed) items, or an explicit list of ids.
  app.post<{ Body: { mediaIds?: string[] } }>('/api/analysis/batch', async (request, reply) => {
    const ids =
      request.body?.mediaIds ??
      ctx.db
        .listMediaItems()
        .filter((m) => m.status === 'uploaded')
        .map((m) => m.id);
    const jobs = [];
    for (const id of ids) {
      if (!ctx.db.getMediaItem(id)) continue;
      jobs.push(ctx.db.createAnalysisJob(id));
    }
    return reply.status(202).send({ jobs });
  });

  app.get(
    '/api/analysis/jobs',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async () => {
      return { jobs: ctx.db.listAnalysisJobs() };
    },
  );

  app.get<{ Params: { id: string } }>('/api/analysis/jobs/:id', async (request, reply) => {
    const job = ctx.db.getAnalysisJob(request.params.id);
    if (!job) return reply.status(404).send({ error: 'Not found' });
    return { job };
  });

  // Retry a failed analysis job (spec: POST /jobs/{id}/retry).
  app.post<{ Params: { id: string } }>('/api/analysis/jobs/:id/retry', async (request, reply) => {
    const job = ctx.db.getAnalysisJob(request.params.id);
    if (!job) return reply.status(404).send({ error: 'Not found' });
    if (job.status !== 'failed') {
      return reply.status(409).send({ error: `Job is ${job.status}; only failed jobs can be retried` });
    }
    const retried = ctx.db.createAnalysisJob(job.mediaId!);
    return reply.status(202).send({ job: retried });
  });

  // Analysis (insight) for a media item (spec: GET /media/{id}/analysis).
  app.get<{ Params: { id: string } }>('/api/media/:id/analysis', async (request, reply) => {
    const media = ctx.db.getMediaItem(request.params.id);
    if (!media) return reply.status(404).send({ error: 'Not found' });
    return { insight: ctx.db.getInsightByMedia(media.id) };
  });

  // Human review/edit of an insight.
  app.put<{
    Params: { mediaId: string };
    Body: {
      summary?: string;
      activity?: string;
      decisions?: string[];
      outcomes?: string[];
      extractedText?: string;
      transcript?: string;
    };
  }>('/api/insights/:mediaId', async (request, reply) => {
    const media = ctx.db.getMediaItem(request.params.mediaId);
    if (!media) return reply.status(404).send({ error: 'Not found' });
    const existing = ctx.db.getInsightByMedia(media.id);
    const insight = ctx.db.upsertInsight({
      mediaId: media.id,
      summary: request.body?.summary ?? existing?.summary ?? '',
      activity: request.body?.activity ?? existing?.activity ?? null,
      decisions: request.body?.decisions ?? existing?.decisions ?? [],
      outcomes: request.body?.outcomes ?? existing?.outcomes ?? [],
      extractedText: request.body?.extractedText ?? existing?.extractedText ?? null,
      transcript: request.body?.transcript ?? existing?.transcript ?? null,
      provider: existing?.provider ?? 'manual',
      model: existing?.model ?? null,
      edited: true,
    });
    if (media.status === 'uploaded' || media.status === 'failed') {
      ctx.db.updateMediaStatus(media.id, 'analyzed');
    }
    return { insight };
  });
}
