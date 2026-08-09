import path from 'node:path';
import fs from 'node:fs';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  mediaDir: string;
  publishDir: string;
  port: number;
  host: string;
  /** Max upload size in bytes (default 500MB to accommodate screen recordings). */
  maxUploadBytes: number;
  /** Job runner poll interval in milliseconds. */
  jobPollMs: number;
  aiProvider: 'anthropic' | 'openai' | 'local';
  anthropicApiKey: string | undefined;
  anthropicModel: string;
  openaiApiKey: string | undefined;
  openaiModel: string;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const dataDir = overrides.dataDir ?? process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
  const config: AppConfig = {
    dataDir,
    dbPath: overrides.dbPath ?? process.env.DB_PATH ?? path.join(dataDir, 'screen-study.db'),
    mediaDir: overrides.mediaDir ?? process.env.MEDIA_DIR ?? path.join(dataDir, 'media'),
    publishDir: overrides.publishDir ?? process.env.PUBLISH_DIR ?? path.join(dataDir, 'published'),
    port: overrides.port ?? Number(process.env.PORT ?? 3000),
    host: overrides.host ?? process.env.HOST ?? '0.0.0.0',
    maxUploadBytes:
      overrides.maxUploadBytes ?? Number(process.env.MAX_UPLOAD_BYTES ?? 500 * 1024 * 1024),
    jobPollMs: overrides.jobPollMs ?? Number(process.env.JOB_POLL_MS ?? 500),
    aiProvider:
      overrides.aiProvider ??
      (process.env.AI_PROVIDER as AppConfig['aiProvider']) ??
      (process.env.ANTHROPIC_API_KEY
        ? 'anthropic'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : 'local'),
    anthropicApiKey: overrides.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY,
    anthropicModel:
      overrides.anthropicModel ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    openaiApiKey: overrides.openaiApiKey ?? process.env.OPENAI_API_KEY,
    openaiModel: overrides.openaiModel ?? process.env.OPENAI_MODEL ?? 'gpt-4o',
  };
  return config;
}

export function ensureDataDirs(config: AppConfig): void {
  for (const dir of [config.dataDir, config.mediaDir, config.publishDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
