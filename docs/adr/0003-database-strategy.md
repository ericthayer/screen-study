# ADR-003: Database & Storage Strategy (SQLite + Filesystem, Behind a Storage Seam)

- **Status:** Accepted (amended from the PR #2 proposal of Postgres + S3)
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-002](0002-backend-architecture.md), [ADR-010](0010-publishing-integration-model.md), DECISIONS.md D2, D9

## Context

Media artifacts (screenshots, recordings, audio) and their metadata (insights, outlines, drafts, publish records) need durable storage. The PR #2 draft proposed Postgres + S3-style object storage. For a single-user, offline-capable local tool that must also run hermetically in CI, external services are pure cost with no benefit.

## Decision

**Media files live on the local filesystem (`data/media/`); all structured data lives in SQLite via `better-sqlite3`. All file I/O goes through the `StorageService` interface (`src/server/services/storage.ts`), implemented by `LocalStorageService`. Routes and publishers never touch `fs` directly.**

- SQLite foreign keys + cascade deletes keep media/insights/sections consistent.
- Data locations are configurable via `DATA_DIR`, `MEDIA_DIR`, and `PUBLISH_DIR`.
- The `StorageService` seam (`save/read/copy/writeText/remove/exists`) is the boundary discipline required by [ADR-002](0002-backend-architecture.md) rule 3: swapping disk for S3 later is a new implementation, not a refactor of call sites.

## Alternatives Considered

- **Postgres + S3 (PR #2 proposal)** — required for multi-user/cloud, but adds two external services, credentials, and network failure modes to a local tool. Rejected for the MVP; the storage seam preserves this as the migration target.
- **SQLite for everything, including media blobs** — single-file simplicity, but bloats the DB, complicates backups, and prevents serving media with range requests. Rejected.
- **Direct `fs` usage in routes** — simplest, but violates the ADR-002 boundary rules and makes the Plan A→B storage migration expensive. Rejected.

## Consequences

- Positive: zero external services — the app runs fully offline and in CI; SQLite is transactional and trivially handles this workload; the seam keeps the cloud migration cheap.
- Negative / accepted risks: single-machine durability (no replication); local disk is the backup story.
- Follow-ups / re-evaluation triggers: adopt Postgres + object storage when multi-user access or cloud deployment is needed (see DECISIONS.md D2 "Revisit if").
