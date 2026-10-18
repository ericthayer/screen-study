import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp({ configOverrides: config });

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`ScreenStudy running at http://localhost:${config.port} (AI provider: ${config.aiProvider})`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
