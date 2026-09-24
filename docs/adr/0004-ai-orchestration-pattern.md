# ADR-004: AI Orchestration Pattern (Async Jobs on a DB-Polled Runner)

- **Status:** Accepted (minimal form of the PR #2 queue proposal)
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-002](0002-backend-architecture.md), [ADR-005](0005-media-processing-pipeline.md), DECISIONS.md D8

## Context

AI work (analysis, transcription, draft generation) takes seconds-to-minutes and can fail transiently (rate limits, provider outages). Doing it synchronously in HTTP requests would blow timeouts, hide failures, and make retries impossible. The question is how jobs are orchestrated, not whether they are async — but a full broker (or even a Postgres-backed worker) is unjustified for a single-user SQLite app.

## Decision

**All AI work runs as asynchronous jobs. HTTP routes only enqueue and return job handles (202 + poll). Jobs are rows in the `analysis_jobs` table, executed by an in-process `JobRunner` (`src/server/services/jobs.ts`).**

- Jobs carry `kind` (`analysis` | `draft_generation`), `status`, `attempts`, `max_attempts`, and `run_at`.
- The runner polls the table and claims due `pending` jobs via an atomic status flip inside an immediate transaction (no double-execution).
- Failures retry with backoff (5s / 30s / 120s) up to `max_attempts`.
- On startup, jobs left in `running` by a crashed process are requeued (`requeueStaleJobs`), so in-flight work is not silently lost.
- Draft generation (`POST /api/case-studies/:id/generate`) is a job, not a synchronous HTTP call.

This preserves the PR #2 seam exactly: the route enqueues, the runner executes. Swapping the runner for a real queue/worker later touches only `services/jobs.ts`.

## Alternatives Considered

- **Synchronous request/response** — simplest code; fails latency and reliability requirements. Rejected.
- **Postgres-backed worker (PR #2 / ADR-005 proposal)** — proper multi-process queueing, but requires Postgres, which ADR-003 rejected for the MVP. Rejected now; it is the designated upgrade path.
- **Full workflow engine (Temporal/Cadence)** — excellent durability and replay, but heavy operational lift for a local single-user tool. Rejected.
- **Fire-and-forget background tasks** (setImmediate/cron) — no durability, no retry semantics, invisible failures. Rejected.

## Consequences

- Positive: resilient to provider flakiness and process crashes; honest job status for the UI; zero new infrastructure; satisfies the no-lost-jobs and worker-kill recovery requirements with the stack already in place.
- Negative / accepted risks: single-process execution (no horizontal worker scaling); polling adds a small idle query load; eventual consistency between upload and analysis requires good status UX.
- Follow-ups / re-evaluation triggers: move to a Postgres-backed worker per ADR-005 when throughput or multi-process scaling demands a real broker (see DECISIONS.md D8 "Revisit if").
