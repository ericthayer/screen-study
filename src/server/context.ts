import type { AppConfig } from './config.js';
import type { ScreenStudyDb } from './db.js';
import type { AiProvider } from './services/ai.js';
import type { JobRunner } from './services/jobs.js';
import type { PublishingAdapter } from './services/publish.js';
import type { StorageService } from './services/storage.js';

export interface AppContext {
  config: AppConfig;
  db: ScreenStudyDb;
  ai: AiProvider;
  storage: StorageService;
  publisher: PublishingAdapter;
  jobs: JobRunner;
}
