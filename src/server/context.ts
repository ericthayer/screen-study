import type { AppConfig } from './config.js';
import type { ScreenStudyDb } from './db.js';
import type { AiProvider } from './services/ai.js';

export interface AppContext {
  config: AppConfig;
  db: ScreenStudyDb;
  ai: AiProvider;
}
