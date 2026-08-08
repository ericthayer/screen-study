# ADR-003: Database Strategy (Postgres + Object Storage)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [feature-media-ingestion](../specs/feature-media-ingestion.md), [ADR-002](0002-backend-architecture.md), [ADR-005](0005-media-processing-pipeline.md), [data-model](../architecture/data-model.md)

## Context

ScreenStudy has two storage shapes: relational metadata (users, media, jobs, insights, sections, drafts, publications) and large binary artifacts (screenshots, recordings, audio). The job system needs atomic state transitions; the AI pipeline needs queryable structured output; uploads need durable, cheap binary storage.

## Decision

**PostgreSQL for all structured data; S3-compatible object storage for media binaries; the DB stores storage pointers (bucket/key), never binary blobs.**

Details:

- **Schema ownership:** each module owns its tables (ADR-002). Migrations via a versioned migration tool (node-pg-migrate or Drizzle — chosen at Sprint 1 start; either satisfies this ADR).
- **Storage layout:** `s3://<bucket>/<env>/<user_id>/<media_id>/<original_filename>`; derived artifacts (thumbnails, transcripts) under `…/<media_id>/derived/`.
- **Access pattern:** all object access through a `StorageService` interface (put/get/delete/signed-url). Media is served only via short-lived signed URLs (NFR-S2).
- **Job state:** Postgres-backed job table (see ADR-005) — transactional enqueue alongside metadata writes keeps ingestion atomic.
- **JSONB** for insight/analysis payloads with a versioned schema marker; normalized columns for anything queried (kind, confidence).

## Alternatives Considered

- **SQLite + local disk** — simplest possible; fails multi-worker concurrency and durability requirements (NFR-R4). Rejected beyond local dev.
- **NoSQL document store** — flexible for AI payloads, but job state transitions and relational integrity (drafts ↔ sources ↔ media) are core. JSONB in Postgres covers the flexibility need. Rejected.
- **Store blobs in Postgres (bytea/large objects)** — simplifies backups but bloats the DB, complicates streaming/range requests, and raises cost. Rejected.

## Consequences

- Positive: one relational store for correctness-critical state; cheap scalable binary storage; transactional outbox pattern available for events; easy local dev (Postgres + MinIO in docker-compose).
- Negative / accepted risks: two storage systems to back up/restore consistently (runbook required — see [operations](../operations/runbooks.md)); signed-URL flow adds a hop.
- Follow-ups: choose migration tool in Sprint 1; define backup/restore runbook before beta (NFR-R4).
