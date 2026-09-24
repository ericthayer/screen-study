# ADR-009: Performance Budgets & Observability Standards

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [NFR §1/§5](../specs/non-functional-requirements.md), [performance plan](../quality/performance.md), [ADR-007](0007-ci-cd-pipeline.md)

## Context

An AI-heavy product can quietly become slow and expensive. Budgets make performance a release criterion, and observability makes pipeline behavior (uploads, jobs, tokens, cost) visible instead of anecdotal.

## Decision

**Adopt the budgets in [NFR §1](../specs/non-functional-requirements.md) as CI-enforced release criteria, and a standard observability stack: structured JSON logs with correlation IDs, OpenTelemetry traces across API → queue → worker, and a metrics/dashboard layer with alert thresholds before beta.**

Standards:

- **Budgets in CI:** bundle-size check on every PR (NFR-P2); Lighthouse CI on the app shell (NFR-P1) on preview deploys; API latency and job-timing budgets verified by load tests in Sprints 4–5.
- **Logging:** JSON, levelled, with `correlation_id` propagated from HTTP request → job → provider call. No PII or content payloads in logs (NFR-S4); AI prompts/responses logged only as metadata (tokens, model, latency, cost).
- **Tracing:** OpenTelemetry SDK from Sprint 2 (when the worker exists); spans for queue wait, provider calls, storage ops.
- **Metrics (minimum set):** upload volume/failures, job latency by type, job failure rate, queue depth, AI token usage + estimated cost per user/job, publish success rate.
- **Alerting (Sprint 5):** job failure rate > 5%/1h, queue depth growing 30 min, p95 API latency > budget 15 min, daily AI cost > configured cap.

## Alternatives Considered

- **Ad-hoc logging only** — debugging across async boundaries becomes guesswork. Rejected.
- **Full APM vendor (Datadog/New Relic) from day one** — strong product, premature cost; OTel keeps the door open. Deferred; OTel export makes adoption a config change.
- **Budgets as documentation only** — unenforced budgets decay. Rejected; CI enforcement is the point.

## Consequences

- Positive: regressions fail builds, not user trust; cost of AI usage is visible per job; Plan B extraction inherits traces/IDs.
- Negative / accepted risks: instrumentation effort in Sprints 1–2; alert tuning is iterative.
- Follow-ups: dashboards + alert thresholds land in Sprint 5 (NFR-O3); load test plan in [performance.md](../quality/performance.md).
