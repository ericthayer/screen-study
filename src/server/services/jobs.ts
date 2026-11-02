import type { ScreenStudyDb } from '../db.js';
import type { AiProvider } from './ai.js';
import type { StorageService } from './storage.js';
import type { AnalysisJob } from '../../shared/types.js';
import { generateDraft } from './article.js';

const BACKOFF_SECONDS = [5, 30, 120];

/** Minimal structured logger (satisfied by Fastify's pino logger). */
export interface JobLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

const noopLogger: JobLogger = { info() {}, warn() {}, error() {} };

/**
 * DB-polled job runner (ADR-004 minimal form): analysis and draft-generation
 * jobs are rows in `analysis_jobs`; this loop claims due pending jobs with an
 * atomic status flip, runs them, and retries failures with backoff up to
 * `maxAttempts`. Jobs interrupted by a process restart are requeued on boot
 * (see `requeueStaleJobs`), so no in-flight work is silently lost.
 */
export class JobRunner {
  private timer: NodeJS.Timeout | null = null;
  private runningJob = false;

  constructor(
    private db: ScreenStudyDb,
    private ai: AiProvider,
    private storage: StorageService,
    private pollMs: number,
    private log: JobLogger = noopLogger,
  ) {}

  start(): void {
    if (this.timer) return;
    const recovered = this.db.requeueStaleJobs(60);
    if (recovered > 0) this.log.warn({ recovered }, 'requeued stale jobs on startup');
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    this.timer.unref?.();
    if (recovered > 0) void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Process jobs until the queue is idle. With `ignoreRunAt`, due-time gating
   * (retry backoff) is bypassed so tests can exhaust retries instantly.
   */
  async drain(maxTicks = 200, ignoreRunAt = false): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
      await this.tick(ignoreRunAt);
      const pending = this.db
        .listAnalysisJobs()
        .some((j) => j.status === 'pending' || j.status === 'running');
      if (!pending) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('Job runner did not drain in time');
  }

  private async tick(ignoreRunAt = false): Promise<void> {
    if (this.runningJob) return;
    const job = this.db.claimNextJob(ignoreRunAt);
    if (!job) return;
    this.runningJob = true;
    try {
      await this.execute(job);
    } finally {
      this.runningJob = false;
    }
  }

  /** Fields attached to every job log line so it joins back to the API request (NFR-O1). */
  private logFields(job: AnalysisJob): Record<string, unknown> {
    return {
      jobId: job.id,
      kind: job.kind,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
      correlationId: job.correlationId,
      mediaId: job.mediaId,
      caseStudyId: job.caseStudyId,
    };
  }

  private async execute(job: AnalysisJob): Promise<void> {
    const startedAt = Date.now();
    this.log.info(this.logFields(job), 'job started');
    try {
      if (job.kind === 'analysis') {
        await this.runAnalysis(job);
      } else {
        await this.runDraftGeneration(job);
      }
      this.log.info({ ...this.logFields(job), durationMs: Date.now() - startedAt }, 'job succeeded');
    } catch (error) {
      this.fail(job, error instanceof Error ? error.message : String(error), Date.now() - startedAt);
    }
  }

  private fail(job: AnalysisJob, message: string, durationMs: number): void {
    const fields = { ...this.logFields(job), durationMs, error: message };
    if (job.attempts < job.maxAttempts) {
      const backoff = BACKOFF_SECONDS[Math.min(job.attempts - 1, BACKOFF_SECONDS.length - 1)];
      this.db.rescheduleJob(job.id, message, backoff);
      this.log.warn({ ...fields, retryInSeconds: backoff }, 'job failed; retry scheduled');
    } else {
      this.log.error(fields, 'job failed permanently');
      this.db.updateAnalysisJob(job.id, 'failed', message);
      if (job.kind === 'analysis' && job.mediaId) {
        this.db.updateMediaStatus(job.mediaId, 'failed');
      }
    }
  }

  private async runAnalysis(job: AnalysisJob): Promise<void> {
    if (!job.mediaId) throw new Error('Analysis job has no media_id');
    const media = this.db.getMediaItem(job.mediaId);
    if (!media) throw new Error('Media item not found');

    this.db.updateMediaStatus(media.id, 'analyzing');
    const absolutePath = this.storage.absolutePath(media.filename);
    if (!absolutePath || !this.storage.exists(media.filename)) {
      throw new Error(`Media file missing from storage: ${media.filename}`);
    }
    const analysis = await this.ai.analyzeMedia(media, absolutePath);
    this.db.upsertInsight({
      mediaId: media.id,
      summary: analysis.summary,
      activity: analysis.activity,
      decisions: analysis.decisions,
      outcomes: analysis.outcomes,
      extractedText: analysis.extractedText,
      transcript: analysis.transcript,
      provider: this.ai.name,
      model: this.ai.model,
    });
    this.db.updateMediaStatus(media.id, 'analyzed');
    this.db.updateAnalysisJob(job.id, 'done');
  }

  private async runDraftGeneration(job: AnalysisJob): Promise<void> {
    if (!job.caseStudyId) throw new Error('Draft job has no case_study_id');
    const draft = await generateDraft(this.db, this.ai, job.caseStudyId);
    this.db.updateAnalysisJob(job.id, 'done', null, { draftId: draft.id });
  }
}
