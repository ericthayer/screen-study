import path from 'node:path';
import fs from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ensureDataDirs, loadConfig, type AppConfig } from './config.js';
import { ScreenStudyDb } from './db.js';
import { createAiProvider } from './services/ai.js';
import { JobRunner } from './services/jobs.js';
import { FilesystemPublisher } from './services/publish.js';
import { LocalStorageService } from './services/storage.js';
import type { AppContext } from './context.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerCaseStudyRoutes } from './routes/caseStudies.js';
import { registerDraftRoutes } from './routes/drafts.js';

export interface BuildAppOptions {
  configOverrides?: Partial<AppConfig>;
  serveWeb?: boolean;
  /** Start the background job runner (disable in tests, which drain manually). */
  startJobRunner?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = loadConfig(options.configOverrides);
  ensureDataDirs(config);

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const db = new ScreenStudyDb(config.dbPath);
  const ai = createAiProvider(config);
  const storage = new LocalStorageService(config.mediaDir);
  const ctx: AppContext = {
    config,
    db,
    ai,
    storage,
    publisher: new FilesystemPublisher(storage),
    jobs: new JobRunner(db, ai, storage, config.jobPollMs),
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

  const registerApi = (instance: FastifyInstance) => {
    registerMediaRoutes(instance, ctx);
    registerAnalysisRoutes(instance, ctx);
    registerCaseStudyRoutes(instance, ctx);
    registerDraftRoutes(instance, ctx);
    instance.get('/api/health', async () => ({ status: 'ok', provider: ctx.ai.name }));
  };

  // Canonical surface. The /api/v1 alias keeps the spec'd contract (PR #2
  // feature specs) working while both spellings coexist.
  registerApi(app);
  await app.register(async (instance) => registerApi(instance), { prefix: '/api/v1' });

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

  if (options.startJobRunner !== false) {
    ctx.jobs.start();
  }

  // Expose the context for tests and operational tooling.
  (app as unknown as { ctx: AppContext }).ctx = ctx;

  app.addHook('onClose', async () => {
    ctx.jobs.stop();
    ctx.db.close();
  });

  return app;
}
