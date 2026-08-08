# Technical Decisions

This document records the Sprint 1 decisions that unblock the rest of the roadmap. Each entry includes the decision, the rationale, and what it would take to revisit it.

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
