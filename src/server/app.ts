import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
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

/** Client-supplied request IDs are honored only if they are short and header-safe. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = loadConfig(options.configOverrides);
  ensureDataDirs(config);

  // Correlation IDs (NFR-O1): reuse a well-formed incoming `x-request-id`, else
  // generate one. It is echoed on every response, bound to request logs, and
  // persisted on enqueued jobs so worker logs join back to the API call.
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    },
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  const db = new ScreenStudyDb(config.dbPath);
  const ai = createAiProvider(config);
  const storage = new LocalStorageService(config.mediaDir);
  const ctx: AppContext = {
    config,
    db,
    ai,
    storage,
    publisher: new FilesystemPublisher(storage, new LocalStorageService(config.publishDir)),
    jobs: new JobRunner(db, ai, storage, config.jobPollMs, app.log.child({ component: 'jobs' })),
  };

  await app.register(multipart, {
    limits: { fileSize: config.maxUploadBytes, files: 20 },
  });

  // Basic abuse protection for API routes (single-user local tool, generous limits).
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: '1 minute',
  });

  // Serve uploaded media (kept off /api and /api/v1 so the media CRUD routes
  // own that namespace).
  await app.register(fastifyStatic, {
    root: config.mediaDir,
    prefix: '/files/',
    decorateReply: false,
  });

  // Routes are registered at root-relative paths (e.g. /media, /health) so
  // they can be mounted under both /api and /api/v1 prefixes.
  const registerApi = (instance: FastifyInstance) => {
    registerMediaRoutes(instance, ctx);
    registerAnalysisRoutes(instance, ctx);
    registerCaseStudyRoutes(instance, ctx);
    registerDraftRoutes(instance, ctx);
    instance.get('/health', async () => ({ status: 'ok', provider: ctx.ai.name }));
  };

  // Canonical surface (/api) plus the spec'd versioned alias (/api/v1) — both
  // resolve to the same handlers. (D11)
  await app.register(async (instance) => registerApi(instance), { prefix: '/api' });
  await app.register(async (instance) => registerApi(instance), { prefix: '/api/v1' });

  // Serve the built web client in production.
  const webDist = path.join(process.cwd(), 'dist', 'web');
  if (options.serveWeb !== false && fs.existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api/') || request.raw.url?.startsWith('/files/')) {
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
