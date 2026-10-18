# Technical Decisions

This document records the Sprint 1 decisions that unblock the rest of the roadmap. Each entry includes the decision, the rationale, and what it would take to revisit it.

Per-decision records live in [`docs/adr/`](docs/adr/) (ADR-001…010); code comments reference those ADR numbers, and this file remains the sprint-level summary (the D-numbers below map to the ADRs in the [`docs/adr/` index](docs/adr/README.md)).

## D1 — Stack: Node.js + TypeScript, Fastify backend, React + Vite frontend

**Decision:** Single TypeScript monorepo. Fastify serves the REST API and static assets; React + Vite serves the web client.

**Rationale:**
- One language across the stack keeps the data model (`src/shared/types.ts`) shared between client and server without code generation.
- Fastify is fast, has first-class multipart support (`@fastify/multipart`) for large screen recordings, and is easy to test with `app.inject()`.
- Vite gives instant frontend dev feedback and a simple production build.

**Revisit if:** the project needs heavier media processing pipelines (then a Python sidecar for ML tasks may be worth it).

## D2 — Storage: local filesystem + SQLite

**Decision:** Media files live in `data/media/`; metadata, insights, outlines, drafts, and publish records live in SQLite via `better-sqlite3`.

**Rationale:**
- Zero external services — the app runs fully offline and in CI.
- SQLite handles this workload (single user, thousands of rows) trivially and is transactional.
- Foreign keys + cascade deletes keep media/insights/sections consistent.

**Revisit if:** multi-user access or cloud deployment is needed (then Postgres + object storage).

## D3 — AI provider: pluggable, defaulting to Anthropic, with OpenAI and offline-local providers

**Decision:** All AI access goes through the `AiProvider` interface (`src/server/services/ai.ts`):
- `anthropic` — vision analysis + article generation (needs `ANTHROPIC_API_KEY`).
- `openai` — vision analysis, article generation, and Whisper transcription (needs `OPENAI_API_KEY`).
- `local` — deterministic offline fallback that produces metadata-based placeholder insights and template-generated articles. It exists so the entire pipeline (upload → analyze → organize → draft → publish) works without network access or API keys, and so tests are hermetic.

Provider selection is via `AI_PROVIDER`, auto-detected from whichever API key is present.

**Known limitation:** audio/video transcription currently requires the OpenAI provider (Whisper). Video frame extraction for vision analysis of recordings requires ffmpeg and is a future enhancement.

## D4 — Publishing target: filesystem, static-site-compatible

**Decision:** Publishing writes a directory per article to `PUBLISH_DIR` (default `data/published/<slug>/`) containing `index.md` (Markdown + YAML frontmatter) and the referenced media files, with media references rewritten to relative `./file` links.

**Rationale:**
- The output is directly droppable into Astro/Hugo/Eleventy content collections — no lock-in to a specific static site generator.
- Unpublish is a directory delete; publish history is tracked in SQLite (`publish_records`).

**Revisit if:** a hosted CMS or direct GitHub-PR publishing is wanted — add a new publisher behind the same route surface.

## D5 — Article format: Markdown with YAML frontmatter

**Decision:** Markdown is the canonical article format; every generated draft carries frontmatter (`title`, `date`, `draft`). Drafts are versioned (`article_drafts` table, one row per version) and editing creates a new version rather than mutating in place.

## D6 — Data model

```
media_items      uploaded artifact (kind: image|video|audio, status: uploaded|analyzing|analyzed|failed)
insights         1:1 with media_items — summary, activity, decisions[], outcomes[], extracted_text, transcript
case_studies     a narrative (usually one week of work)
case_study_sections  problem | process | decisions | outcomes (auto-created per case study)
section_media    assignment of media to sections (a media item appears in at most one section per study)
article_drafts   versioned Markdown drafts per case study
publish_records  publish/unpublish history per draft
analysis_jobs    batch analysis progress/error tracking
```

## D7 — Tooling: ESLint (flat config), Vitest, GitHub Actions CI

**Decision:** `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all run in CI on every PR.

## D8 — Background jobs: DB-polled runner with claim semantics, backoff, and crash recovery

**Decision:** Analysis and draft-generation jobs are rows in `analysis_jobs` (with `kind`, `attempts`, `max_attempts`, `run_at`). A `JobRunner` polls the table, claims due `pending` jobs via an atomic status flip inside an immediate transaction, runs them, and retries failures with backoff (5s/30s/120s) up to `maxAttempts`. On startup, jobs left in `running` by a crashed process are requeued (`requeueStaleJobs`), so in-flight work is not silently lost. Draft generation (`POST /api/case-studies/:id/generate`) is now a job (202 + poll), not a synchronous HTTP call.

**Rationale:** Satisfies NFR-R2/R5 (no lost jobs) and AC-ANL-03 (worker-kill recovery) with the stack already in place (better-sqlite3), without introducing a separate queue service. Preserves the ADR-004 seam: the route enqueues, the runner executes — swapping the runner for a real queue/worker later touches only `services/jobs.ts`.

**Revisit if:** throughput or multi-process scaling demands a real broker (then Postgres-backed worker per ADR-005).

## D9 — Publishing & storage seams: adapter interfaces

**Decision:** Two interfaces decouple the app from its local-disk/SQLite MVP choices:
- `StorageService` (`src/server/services/storage.ts`) wraps all file I/O; `LocalStorageService` is the disk implementation. Routes and the publisher never touch `fs` directly.
- `PublishingAdapter` (`src/server/services/publish.ts`) exposes `render/dryRun/publish/retract` per ADR-010; `FilesystemPublisher` is the first implementation, and a dry-run endpoint (`POST /api/drafts/:id/publish/dry-run`) previews a publish without writing.

**Rationale:** Keeps the Plan A→B migration cheap — S3 storage or a Git-push/CMS publishing target become new implementations of an interface, not refactors of call sites.

## D10 — Upload integrity: magic-byte validation + content-hash dedupe

**Decision:** Uploads are validated server-side by content, not just by client claims (FR-ING-04): binary formats are checked against magic-byte signatures (PNG/JPEG/GIF/WebP/MP4/WebM/MP3/WAV/OGG/FLAC, M4A via brand), and SVG by content marker. A SHA-256 `content_hash` is computed per upload; an identical re-upload returns the existing media item instead of storing a duplicate (FR-ING-07), reported in the response's `duplicates` array.

## D11 — API versioning: `/api/v1` alias alongside `/api`

**Decision:** The canonical surface stays `/api/…` (used by the bundled web client); the same routes are also mounted under `/api/v1/…` to match the PR #2 feature-spec contract. Both spellings coexist during the MVP.

## D12 — Correlation IDs across API → job → worker logs (ADR-009 amendment)

**Decision:** Each request gets an `x-request-id` (a safe incoming value is reused, else a UUID), echoed on the response and bound to Fastify's JSON request logs. Routes that enqueue work store it on the job (`analysis_jobs.correlation_id`), and the `JobRunner` logs structured lifecycle events carrying it, so a failing job can be traced back to the request that created it.

**Rationale:** Delivers the cheapest, highest-value slice of NFR-O1 with the logger already in place (pino via Fastify) — no telemetry dependencies.

**Revisit if:** OTel tracing lands (the correlation ID becomes/links to the trace ID).

## D13 — Deterministic quality gates: outline rubric, draft groundedness, bundle validation

**Decision:** Three deterministic checks gate the pipeline:
- **Outline rubric (AC-ORG-05)** — `reviewOutline` in `services/organize.ts` flags an outline as `review.needsReview` when no media is assigned, fewer than 2 sections have media, or more than half of the assigned media lack insights. `POST /case-studies/:id/generate` returns **409** with the reasons unless the body sets `acknowledgeReview: true`.
- **Groundedness (AC-GEN-04)** — `assessGroundedness` in `services/article.ts` checks the draft's `**filename**` references against the case study's media: the draft must reference at least 50% of them and no unknown media filenames (bold tokens with a media extension; names like **Next.js** are ignored). Results are returned on `GET /drafts/:id` and dry-run; `POST /drafts/:id/publish` returns **409** for ungrounded drafts. Fixing requires editing the draft (a new version), so the gate is "disabled until resolved".
- **Bundle validation (AC-PUB-01)** — `validateBundle` in `services/publish.ts` checks frontmatter (`title`, `date` as YYYY-MM-DD, `draft`), that every `./file` image is included in the bundle, and that images have non-empty alt text. Dry-run reports `issues`; publish returns **422** when any exist.

**Rationale:** Predictable, offline, testable gates that keep incoherent or hallucinated output from being drafted/published silently, without depending on a model to grade a model.

**Revisit if:** LLM-graded rubrics are added (they can feed the same `review`/`groundedness` shapes).

## Explicitly deferred (tracked, target sprint)

Per the PR #2 plan, the following are intentionally **not** in this MVP and are deferred to the noted sprint:

- **Authentication / per-user authorization** (ADR-006, NFR-S1) — single-user local tool by design (D2); no `users` table. *Target: when multi-user hosting is needed.*
- **Observability** (ADR-009, NFR-O1/O2) — correlation IDs (`x-request-id` → `analysis_jobs.correlation_id`) and structured job lifecycle logs now ship (D12); OTel traces, metrics, and token/cost logging are still deferred. *Target: Sprint 2 (OTel) / Sprint 5 (alerts).*
- **Accessibility hardening** (ADR-008, NFR-A1–A5) — no Radix/axe CI/manual audit yet; the review dialog ships focus + Esc handling, and pages now have polite live regions for job/organize/publish status, `role="alert"` errors, labelled controls, and a keyboard-operable dropzone. *Target: Sprint 4.*
- **Chunked/resumable upload** (FR-ING-03) — whole-file multipart with a 500MB cap; no upload sessions. *Target: when >500MB recordings are common.*
- **Malware scanning** (FR-ING-05, NFR-S2) — beyond signature sniffing. *Target: with storage backend.*
- **LLM-scored organization & groundedness rubrics** (AC-ORG-05, AC-GEN-04) — deterministic rubric and groundedness gates now ship (D13); model-graded scoring and per-claim source references (AC-GEN-01) remain deferred. *Target: Sprint 3–4.*
- **Git-push / CMS publishing target** (ADR-010) — the `PublishingAdapter` seam is in place; the Git adapter itself is deferred. *Target: Sprint 4.*
