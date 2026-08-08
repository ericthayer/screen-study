# ADR-004: AI Orchestration Pattern (Async Job Pipeline)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [feature-ai-analysis](../specs/feature-ai-analysis.md), [ADR-005](0005-media-processing-pipeline.md), [ADR-002](0002-backend-architecture.md), [NFR](../specs/non-functional-requirements.md)

## Context

AI work (transcription, visual analysis, insight extraction, drafting) takes seconds-to-minutes and can fail transiently (rate limits, provider outages). Doing this synchronously in HTTP requests would blow timeouts, hide failures, and make retries impossible. The question is how jobs are orchestrated, not whether they are async.

## Decision

**All AI and media-processing work runs as asynchronous jobs on a queue; HTTP requests only enqueue and return job handles. Orchestration is an explicit job state machine with durable status, retries, and domain events.**

Pattern:

1. `media.ready` event → fan-out per-artifact analysis jobs (`transcribe`, `visual_analyze`, `extract_insights`).
2. Job states: `queued → running → succeeded | failed | cancelled`; transitions are atomic DB updates and emit domain events (in-process pub/sub now; bus-compatible payloads per ADR-002 discipline).
3. Retries: exponential backoff, max 3, transient/permanent classification (NFR-R2). Handlers are idempotent (NFR-R3).
4. Multi-step pipelines (analyze → group → draft) are coordinated by a lightweight orchestrator module that reacts to domain events — no bespoke per-feature glue.
5. All provider calls go through the AI gateway (secrets, per-user rate limits, token/cost logging — NFR-S3/O2).

## Alternatives Considered

- **Synchronous request/response** — simplest code, fails latency/reliability NFRs. Rejected.
- **Full workflow engine (Temporal/Cadence)** — excellent durability and replay, but heavy operational lift for v1 (cluster, workers, SDK lock-in). Rejected now; job payloads and state machine are designed so Temporal could execute them later.
- **Fire-and-forget background tasks** (setImmediate/cron) — no durability, no retry semantics, invisible failures. Rejected.

## Consequences

- Positive: resilient to provider flakiness; UI gets honest status; horizontal scaling by adding workers; clean extraction path to services (Plan B).
- Negative / accepted risks: eventual consistency between upload and analysis requires good status UX; state machine and idempotency add implementation rigor.
- Follow-ups: queue technology decision in [ADR-005](0005-media-processing-pipeline.md); event payload schemas in [sequence diagrams](../architecture/sequence-diagrams.md).
