# ADR-005: Media Processing Pipeline & Queue Technology

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-003](0003-database-strategy.md), [ADR-004](0004-ai-orchestration-pattern.md), [feature-media-ingestion](../specs/feature-media-ingestion.md), [feature-ai-analysis](../specs/feature-ai-analysis.md)

## Context

ADR-004 commits to async jobs; this ADR picks the queue substrate and the media-processing toolchain. Constraints: small team (Plan A), Postgres already in the stack (ADR-003), need delayed retries and at-least-once delivery, and a preference for one less infrastructure service to operate.

## Decision

**Use a Postgres-backed job queue (Graphile Worker) with a dedicated worker deployment; use ffmpeg (via fluent-ffmpeg / spawned binaries) for media probing, thumbnails, and audio extraction.**

Pipeline stages:

1. **Ingest:** upload → validate (magic bytes, size) → store object → insert `media` row + enqueue `ingest.finalize` job in the same transaction (transactional enqueue).
2. **Derive:** `media.probe` (ffprobe metadata), `media.thumbnail`, `media.audio_extract` (for video→transcription).
3. **Analyze:** per ADR-004 (`transcribe`, `visual_analyze`, `extract_insights`).
4. **Compose:** `grouping.run`, `draft.generate`, `publish.push` (Sprints 3–4).

Queue details: per-type concurrency limits, exponential backoff with jitter, `failed` jobs retained for inspection/retry from the UI, idempotency keys = `(job_type, media_id, payload_hash)`.

## Alternatives Considered

- **Redis-backed (BullMQ)** — richer feature set and ecosystem; requires operating Redis. Acceptable fallback if Postgres queue throughput becomes the bottleneck.
- **SQS/PubSub (managed)** — minimal ops; weakest local-dev story and adds cloud lock-in before the first deploy target is chosen. Rejected for v1.
- **Kafka/event streaming** — built for Plan B scale; massive overkill for v1. Rejected (revisit at the Sprint 2 gate).

## Consequences

- Positive: zero new infrastructure (Postgres already required); transactional enqueue removes a whole class of lost-job bugs; SQL visibility into the queue aids debugging.
- Negative / accepted risks: Postgres doubles as queue — load watch per NFR-O2; Graphile Worker is TypeScript-native, so a non-TS extraction (Plan B services) would adopt BullMQ/SQS instead.
- Follow-ups: queue-depth and job-latency dashboards (Sprint 5); load test backlog drain (see [performance](../quality/performance.md)).
