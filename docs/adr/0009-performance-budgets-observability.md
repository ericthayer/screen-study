# ADR-009: Performance Budgets and Observability Standards

- **Status:** Deferred — *Target: Sprint 2 (OpenTelemetry traces) / Sprint 5 (dashboards & alerts)*
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-004](0004-ai-orchestration-pattern.md), [ADR-007](0007-ci-cd-pipeline.md), DECISIONS.md "Explicitly deferred"

## Context

The PR #2 plan called for structured logging with correlation IDs, OpenTelemetry traces across the pipeline, token/cost logging for AI provider calls, performance budgets, and alerting. For Sprint 1, the priority was a working, recoverable pipeline; the DB-polled job runner (ADR-004) already records the operational facts that matter most (job status, attempts, errors) without any telemetry stack.

## Decision

**No structured logging, correlation IDs, OTel traces, metrics, or token/cost logging in the MVP.** Operational visibility comes from the `analysis_jobs` table (status, attempts, error messages) and the dry-run/retry endpoints. Performance budgets are not yet enforced in CI.

## Alternatives Considered

- **Full observability stack in Sprint 1 (PR #2 schedule)** — valuable, but premature for a single-user local app whose only "production" is the operator's machine; the job table covers the essential failure-visibility needs. Deferred.
- **Console-only logging forever** — acceptable now, but multi-provider AI costs and job latency trends will need real telemetry as usage grows. Rejected as the end state.

## Consequences

- Positive: zero telemetry dependencies; failures are still visible and recoverable via the job table and retry endpoints.
- Negative / accepted risks: no latency percentiles, no AI cost tracking, no alerting; diagnosing provider flakiness relies on stored job errors.
- Follow-ups / re-evaluation triggers: Sprint 2 — OTel traces across upload → analysis → draft → publish; Sprint 5 — dashboards, alerting, and token/cost logging. This feeds the Plan A→B re-evaluation gate described in ADR-002.
