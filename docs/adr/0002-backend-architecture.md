# ADR-002: Backend Architecture (Modular Monolith with Boundary Discipline)

- **Status:** Accepted
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-003](0003-database-strategy.md), [ADR-004](0004-ai-orchestration-pattern.md), [ADR-010](0010-publishing-integration-model.md), DECISIONS.md D1, D6, D9

## Context

The PR #2 plan evaluated two delivery paths: Plan A (MVP monolith first, fastest time-to-value) and Plan B (pipeline-first modular services). Plan A was adopted, but only with explicit "modular boundary discipline" so a later migration toward Plan B stays low-risk instead of requiring a rewrite.

## Decision

**The backend is a single Fastify + TypeScript service (modular monolith). Modules communicate through application-level service interfaces, and all long-running work goes through the job queue — never inline in an HTTP request.**

Boundary discipline rules:

1. Each feature module owns its own tables; cross-module reads go through the owning module's service interface (no cross-module table access).
2. All long-running work (analysis, draft generation) is enqueued as a job; routes only enqueue and return job handles (see [ADR-004](0004-ai-orchestration-pattern.md)).
3. All file I/O goes through the `StorageService` seam, never direct `fs` calls in routes or publishers (see [ADR-003](0003-database-strategy.md)).
4. Publishing goes through the `PublishingAdapter` seam so new targets are added without touching call sites (see [ADR-010](0010-publishing-integration-model.md)).

## Alternatives Considered

- **Plan B: dedicated services from day one** (ingestion, analysis, composition, publishing) — stronger scaling and team parallelism, but far higher initial complexity and operational overhead for a single-user MVP. Rejected now; the boundary rules above keep the extraction path open.
- **Unstructured monolith** — fastest to write, but cross-module table access and in-request processing would make the Plan A→B migration a rewrite. Rejected.

## Consequences

- Positive: one process to run and test (`app.inject()`); low ops overhead; seams isolate every planned migration axis.
- Negative / accepted risks: discipline is enforced by convention and review, not by the compiler or process boundaries.
- Follow-ups / re-evaluation triggers: re-evaluate Plan B boundaries at the end of Sprint 2 using ingestion volume, AI job latency/failure rates, contributor concurrency, and publishing integration complexity. If two or more indicators exceed the NFR thresholds, open an ADR amendment adopting Plan B boundaries for the affected modules.
