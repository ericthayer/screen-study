# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

ScreenStudy turns captured work artifacts (screenshots, screen recordings, audio) into polished UX Engineering case-study articles. Single TypeScript monorepo: Fastify REST API + React/Vite web client. Local-first: SQLite (`better-sqlite3`) for structured data, filesystem for media and published output. No external services required.

Pipeline: **upload → analyze → organize → draft → publish**.

## Setup and Commands

Requires Node.js 20+ (CI uses 22).

```bash
npm install         # install dependencies
npm run dev         # API server on :3000 (tsx watch)
npm run dev:web     # web client on :5173 (proxies API/media to :3000)
npm test            # Vitest (unit + API pipeline tests)
npm run lint        # ESLint (flat config)
npm run typecheck   # tsc --noEmit
npm run build       # tsc -p tsconfig.build.json && vite build
npm start           # serve API + built web client on :3000
```

**Before committing, always run:** `npm run lint`, `npm run typecheck`, `npm test`. CI (`.github/workflows/ci.yml`) runs all four gates plus `npm run build` on every PR — all must pass.

## Repository Layout

```
src/
  shared/types.ts        # data model shared between client and server (no codegen)
  server/
    index.ts             # entry point
    app.ts               # buildApp() — Fastify wiring; mounts routes under /api and /api/v1
    config.ts            # env-based config (DATA_DIR, MEDIA_DIR, PUBLISH_DIR, PORT, AI_PROVIDER, API keys)
    db.ts                # SQLite schema + data access (better-sqlite3)
    context.ts           # app context (config, db, AI provider, job runner, storage)
    routes/              # media, analysis, caseStudies, drafts (thin: validate → call services)
    services/
      ai.ts              # AiProvider interface + anthropic/openai/local implementations
      jobs.ts            # JobRunner — DB-polled async job execution (ADR-004)
      storage.ts         # StorageService seam — all file I/O (ADR-003)
      publish.ts         # PublishingAdapter seam — render/dryRun/publish/retract (ADR-010)
      article.ts         # draft generation
      organize.ts        # section assignment + gap detection
  web/                   # React SPA (pages/, components/, api.ts client)
tests/                   # Vitest; api.test.ts runs the full pipeline end to end
docs/adr/                # ADR-001…010 architecture decision records + index
DECISIONS.md             # sprint-level decision summary (D1–D11)
data/                    # runtime data (SQLite DB, media, published) — gitignored
```

## Architecture Rules (enforced by ADRs — do not bypass)

1. **No long-running work in HTTP requests.** Analysis and draft generation are enqueued as jobs in `analysis_jobs`; routes return 202 + a job handle, and clients poll. The `JobRunner` claims, retries (backoff 5s/30s/120s), and requeues stale jobs on startup.
2. **No direct `fs` access in routes or publishers.** All file I/O goes through the `StorageService` interface.
3. **No direct AI SDK calls outside `services/ai.ts`.** All AI access goes through the `AiProvider` interface; keep the offline `local` provider working so tests stay hermetic.
4. **Publishing only through `PublishingAdapter`.** New targets (Git-push, CMS) are new implementations of the interface, not changes to call sites.
5. **Module boundary discipline:** each feature module owns its own tables; cross-module reads go through the owning module's service functions in `db.ts`.
6. **API surface:** canonical routes under `/api/…`; the identical mount under `/api/v1/…` must be preserved (feature-spec contract).
7. **Drafts are versioned:** editing creates a new row/version; never mutate a draft in place.

## Testing

- Tests use the offline `local` AI provider and temp data dirs (`mkdtempSync`) — no network, no API keys, no fixtures in `data/`.
- `tests/api.test.ts` exercises the full pipeline via `app.inject()`; keep it passing end to end.
- When changing route behavior, extend the existing test files rather than adding new frameworks or tools.

## Environment Variables

`DATA_DIR`, `DB_PATH`, `MEDIA_DIR`, `PUBLISH_DIR`, `PORT`, `HOST`, `MAX_UPLOAD_BYTES` (default 500MB), `JOB_POLL_MS`, `AI_PROVIDER` (`anthropic`|`openai`|`local`), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Provider auto-detects from whichever key is present; defaults to `local` (fully offline).

## Documentation Conventions

- Architecture decisions: add/amend the ADR in `docs/adr/` and update `DECISIONS.md` in the same commit. Code comments reference ADR numbers (e.g., `// … (ADR-004)`) — keep them in sync when seams change.
- Deferred work is tracked in DECISIONS.md "Explicitly deferred" and in the corresponding Deferred ADRs (006, 008, 009).

## Gotchas

- Upload validation is by content (magic bytes / SVG marker), not client MIME type — don't weaken this; tests cover it.
- Re-uploaded identical files dedupe by SHA-256 `content_hash` and return the existing media item.
- Audio/video transcription requires the OpenAI provider (Whisper); video frame extraction needs ffmpeg (future).
- The repo is ESM (`"type": "module"`); internal imports use `.js` extensions (NodeNext resolution).
