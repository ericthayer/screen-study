# Architecture Decision Records

This directory records ScreenStudy's architecture decisions. Each ADR follows the [template](0000-adr-template.md). Status key: **Proposed** (drafted, undecided) → **Accepted** (decided) → **Superseded** (replaced by a newer ADR). **Deferred** marks a decision intentionally postponed to a later sprint.

These ADRs were originally drafted as **Proposed** in the PR #2 SDD framework and are adopted here as records of the **as-built** Sprint 1 system. [`DECISIONS.md`](../../DECISIONS.md) remains the sprint-level summary (D1–D11); the ADRs below are the per-decision records that code comments reference.

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](0001-frontend-architecture.md) | Frontend architecture (React + Vite SPA) | Accepted |
| [ADR-002](0002-backend-architecture.md) | Backend architecture (modular monolith, boundary discipline) | Accepted |
| [ADR-003](0003-database-strategy.md) | Database & storage strategy (SQLite + filesystem, storage seam) | Accepted |
| [ADR-004](0004-ai-orchestration-pattern.md) | AI orchestration pattern (async jobs, DB-polled runner) | Accepted |
| [ADR-005](0005-media-processing-pipeline.md) | Media processing pipeline (whole-file upload, content validation) | Accepted (MVP scope) |
| [ADR-006](0006-authn-authz-approach.md) | AuthN/AuthZ approach | Deferred |
| [ADR-007](0007-ci-cd-pipeline.md) | CI/CD pipeline (PR gates: lint, typecheck, test, build) | Accepted |
| [ADR-008](0008-accessibility-compliance-target.md) | Accessibility compliance target (WCAG 2.2 AA) | Deferred |
| [ADR-009](0009-performance-budgets-observability.md) | Performance budgets and observability standards | Deferred |
| [ADR-010](0010-publishing-integration-model.md) | Publishing integration model (static export first, adapter seam) | Accepted (MVP scope) |

## Conventions

- Specs and code reference the ADRs that constrain them (e.g., `// … (ADR-004)` comments in `src/server/services/jobs.ts`).
- Amending a decision: edit the ADR in place, note the amendment with a date, and update `DECISIONS.md` in the same commit. If a decision is replaced wholesale, mark the old ADR **Superseded by ADR-XXXX** and add the new record.
- Deferred ADRs carry a **Target** line naming the sprint or trigger that revisits them (mirroring the "Explicitly deferred" section of `DECISIONS.md`).
