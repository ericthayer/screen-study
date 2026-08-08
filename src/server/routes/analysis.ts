import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

async function runAnalysis(ctx: AppContext, jobId: string): Promise<void> {
  const job = ctx.db.getAnalysisJob(jobId);
  if (!job) return;
  const media = ctx.db.getMediaItem(job.mediaId);
  if (!media) {
    ctx.db.updateAnalysisJob(jobId, 'failed', 'Media item not found');
    return;
  }
  ctx.db.updateAnalysisJob(jobId, 'running');
  ctx.db.updateMediaStatus(media.id, 'analyzing');
  try {
    const absolutePath = path.join(ctx.config.mediaDir, media.filename);
    const analysis = await ctx.ai.analyzeMedia(media, absolutePath);
    ctx.db.upsertInsight({
      mediaId: media.id,
      summary: analysis.summary,
      activity: analysis.activity,
      decisions: analysis.decisions,
      outcomes: analysis.outcomes,
      extractedText: analysis.extractedText,
      transcript: analysis.transcript,
      provider: ctx.ai.name,
      model: ctx.ai.model,
    });
    ctx.db.updateMediaStatus(media.id, 'analyzed');
    ctx.db.updateAnalysisJob(jobId, 'done');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.db.updateMediaStatus(media.id, 'failed');
    ctx.db.updateAnalysisJob(jobId, 'failed', message);
  }
}

export function registerAnalysisRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Analyze a single media item.
  app.post<{ Params: { id: string } }>('/api/media/:id/analyze', async (request, reply) => {
    const media = ctx.db.getMediaItem(request.params.id);
    if (!media) return reply.status(404).send({ error: 'Not found' });
    const job = ctx.db.createAnalysisJob(media.id);
    void runAnalysis(ctx, job.id);
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
      const job = ctx.db.createAnalysisJob(id);
      jobs.push(job);
      void runAnalysis(ctx, job.id);
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
