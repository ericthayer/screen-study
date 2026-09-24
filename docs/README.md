# ScreenStudy Docs Hub

This directory is the single source of truth for how ScreenStudy is specified, decided, built, and operated.

## Contents

| Directory | Purpose |
|---|---|
| [`specs/`](specs/) | Product requirements, per-feature functional specs, non-functional requirements |
| [`adr/`](adr/) | Architecture Decision Records (ADR-001 … ADR-010) |
| [`architecture/`](architecture/) | System overview, frontend/backend architecture, data model, sequence diagrams |
| [`quality/`](quality/) | Accessibility checklist & test matrix, performance budgets, security threat model |
| [`operations/`](operations/) | CI/CD release flow, runbooks, incident response |

## Spec-Driven Development (SDD) Framework

ScreenStudy defines **product specs before implementation**:

1. **PRD** — user goals, personas, success metrics: [`specs/product-requirements.md`](specs/product-requirements.md)
2. **Functional specs** — one per core feature (ingestion, analysis, organization, generation, publishing): `specs/feature-*.md`
3. **Non-functional specs** — performance, accessibility, reliability, security: [`specs/non-functional-requirements.md`](specs/non-functional-requirements.md)
4. **API contracts** — OpenAPI definitions for HTTP APIs, plus event/data contracts for the job pipeline (published under `docs/architecture/` and enforced by contract tests)
5. **Acceptance criteria + test strategy** — defined in each feature spec

### Spec Gate

> **No feature build starts without an approved spec + ADR impact check.**

A spec is "approved" when:

- [ ] PR opened with the spec and reviewed by at least one maintainer
- [ ] Acceptance criteria and test strategy sections are complete
- [ ] An ADR impact check is recorded in the spec (new ADR required, existing ADR amended, or no impact)
- [ ] Linked tasks/issues exist for implementation and tests

### Traceability

Every feature is linked end to end:

```
spec → ADR(s) → implementation tasks → tests → release note
```

Conventions:

- Specs reference the ADRs that constrain them (and vice versa).
- Implementation tasks/issues reference the spec file and ADR numbers.
- Tests are named/mapped to acceptance criteria IDs (e.g., `AC-ING-03`).
- Release notes reference the spec(s) shipped.

## Required ADR Set

ADRs were drafted up front and revised during implementation. Status key: **Proposed** (drafted, undecided) → **Accepted** (decided) → **Superseded** (replaced by a newer ADR).

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](adr/0001-frontend-architecture.md) | Frontend architecture (React + Vite SPA) | Accepted |
| [ADR-002](adr/0002-backend-architecture.md) | Backend architecture (modular monolith with boundary discipline) | Accepted |
| [ADR-003](adr/0003-database-strategy.md) | Database and storage strategy (SQLite + filesystem behind a storage seam) | Accepted |
| [ADR-004](adr/0004-ai-orchestration-pattern.md) | AI orchestration pattern (DB-polled async jobs) | Accepted |
| [ADR-005](adr/0005-media-processing-pipeline.md) | Media processing pipeline | Accepted |
| [ADR-006](adr/0006-authn-authz-approach.md) | AuthN/AuthZ approach | Deferred |
| [ADR-007](adr/0007-ci-cd-pipeline.md) | CI/CD pipeline and validation gates | Accepted |
| [ADR-008](adr/0008-accessibility-compliance-target.md) | Accessibility compliance target (WCAG 2.2 AA baseline) | Deferred |
| [ADR-009](adr/0009-performance-budgets-observability.md) | Performance budgets and observability standards | Deferred |
| [ADR-010](adr/0010-publishing-integration-model.md) | Publishing integration model (filesystem-first adapter seam) | Accepted |

## Delivery Plans

Two incremental sprint options were evaluated. Both share the SDD framework and ADR set above.

### Plan A — "MVP Monolith First" (fastest time-to-value)

| Sprint | Focus | Deliverables |
|---|---|---|
| **0 — Foundations** | Specs + platform baseline | Approve PRD + NFR baseline; finalize ADR-001/002/003/007/008/009; CI skeleton (lint/test/build), branch protections, preview deploys |
| **1 — Media Ingestion Vertical Slice** | Upload end to end | Upload UI + progress + validation; upload API + metadata persistence; media table + job status table + storage pointer model; keyboard/file-input compliance + alt-text workflow placeholder; upload size limits, chunking spec, baseline timings |
| **2 — AI Analysis Pipeline** | Async analysis | Async job queue for media analysis; transcript/insights in normalized schema; UI status tracking for analysis jobs; contract tests + async worker tests in CI |
| **3 — Auto-Organization + Narrative Draft** | Structure + draft | Group artifacts into case-study sections; draft-generation pipeline with review/edit UX; quality scoring rubric and guardrails in spec |
| **4 — Publishing + E2E Hardening** | Ship the loop | Publish/export integration (first target per ADR-010); E2E flow upload → analyze → draft → publish; accessibility audit pass (WCAG AA); performance tuning against budgets |
| **5 — Beta Readiness** | Operate with confidence | Reliability improvements, retries, idempotency; monitoring dashboards and alerting; documentation completeness + onboarding guide |

**Best when:** small team, quick iteration, low ops overhead, high uncertainty.

### Plan B — "Pipeline-First Modular Architecture" (scale/readiness first)

| Sprint | Focus | Deliverables |
|---|---|---|
| **0 — Architecture + Platform Setup** | Foundation | Approve PRD/NFR + ADR set including event-driven decisions; define bounded contexts (ingestion, analysis, drafting, publishing); CI/CD with multi-service pipelines, staged env promotion |
| **1 — Ingestion Service + Frontend Shell** | Intake | Dedicated ingestion service + storage abstraction; frontend shell with upload and job timeline; DB schema with event/audit log foundation |
| **2 — Analysis Service + Workflow Orchestration** | Intelligence | Worker service for AI/transcription/insight extraction; event contracts for pipeline transitions; tracing across services |
| **3 — Composition Service (Auto-Organization + Draft)** | Narrative | Narrative composition service from normalized insights; revision/version model for drafts; contract and resilience tests across services |
| **4 — Publishing Service + Compliance Hardening** | Distribution | Pluggable publishing adapters; accessibility governance in CI (automated a11y checks); performance/load testing at service boundaries |
| **5 — Operational Maturity** | Launch | SLOs/error budgets, rollback strategy, runbooks; security hardening and threat-model closure; beta launch checklist |

**Best when:** expected growth, multiple contributors, need stronger long-term scaling and service autonomy.

### Decision Comparison (A vs B)

| Criterion | Plan A | Plan B |
|---|---|---|
| Delivery speed | **Higher** | Lower |
| Initial complexity | **Lower** | Higher |
| Operational overhead | **Lower** | Higher |
| Scalability/extensibility | Lower | **Higher** |
| Cross-team parallelism | Lower | **Higher** |
| Refactor risk later | Higher | **Lower** |
| Architecture risk now | **Lower** | Higher |

### Recommendation

**Start with Plan A** unless near-term scale/integration demands are already clear. Add a "modular boundary discipline" in Plan A specs/ADRs so migration toward Plan B remains low-risk:

- Each feature module owns its own tables and exposes application-level service interfaces (no cross-module table access) — see [ADR-002](adr/0002-backend-architecture.md).
- All long-running work goes through the job queue (no in-request processing) — see [ADR-004](adr/0004-ai-orchestration-pattern.md).
- Storage access goes through a storage abstraction, never direct SDK calls — see [ADR-003](adr/0003-database-strategy.md).
- Pipeline transitions emit domain events (logged in the job/audit tables from day one), so an event bus can replace in-process dispatch later.

**Re-evaluate at end of Sprint 2** using:

- Ingestion volume trends
- AI job latency and failure rates
- Team size / contributor concurrency
- Publishing integration complexity

If two or more indicators exceed the thresholds in [`specs/non-functional-requirements.md`](specs/non-functional-requirements.md), open an ADR amendment to adopt Plan B boundaries for the affected modules.
