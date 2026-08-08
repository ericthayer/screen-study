import path from 'node:path';
import fs from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ensureDataDirs, loadConfig, type AppConfig } from './config.js';
import { ScreenStudyDb } from './db.js';
import { createAiProvider } from './services/ai.js';
import type { AppContext } from './context.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerCaseStudyRoutes } from './routes/caseStudies.js';
import { registerDraftRoutes } from './routes/drafts.js';

export interface BuildAppOptions {
  configOverrides?: Partial<AppConfig>;
  serveWeb?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = loadConfig(options.configOverrides);
  ensureDataDirs(config);

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const ctx: AppContext = {
    config,
    db: new ScreenStudyDb(config.dbPath),
    ai: createAiProvider(config),
  };

  await app.register(multipart, {
    limits: { fileSize: config.maxUploadBytes, files: 20 },
  });

  // Basic abuse protection for API routes (single-user local tool, generous limits).
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: '1 minute',
  });

  // Serve uploaded media.
  await app.register(fastifyStatic, {
    root: config.mediaDir,
    prefix: '/media/',
    decorateReply: false,
  });

  registerMediaRoutes(app, ctx);
  registerAnalysisRoutes(app, ctx);
  registerCaseStudyRoutes(app, ctx);
  registerDraftRoutes(app, ctx);

  app.get('/api/health', async () => ({ status: 'ok', provider: ctx.ai.name }));

  // Serve the built web client in production.
  const webDist = path.join(process.cwd(), 'dist', 'web');
  if (options.serveWeb !== false && fs.existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api/') || request.raw.url?.startsWith('/media/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  app.addHook('onClose', async () => {
    ctx.db.close();
  });

  return app;
}
