# ADR-007: CI/CD Pipeline & Environment Promotion Model

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ci-cd](../operations/ci-cd.md), [ADR-009](0009-performance-budgets-observability.md), [ADR-008](0008-accessibility-compliance-target.md)

## Context

Plan A needs one simple pipeline now that can grow into multi-service promotion (Plan B). Quality gates (a11y, performance budgets, security scans) must be enforced in CI, not by habit.

## Decision

**GitHub Actions, trunk-based development with PR gates and preview deploys; promotion model: PR preview → `main` auto-deploys to staging → tagged release promotes to production.**

Pipeline stages (per PR):

1. Lint + typecheck (frontend and backend)
2. Unit + worker tests (recorded AI fixtures, no live calls)
3. Contract tests (OpenAPI conformance, provider schemas)
4. Build (Vite bundle + server), bundle-size budget check (NFR-P2)
5. axe accessibility checks on key routes (NFR-A5)
6. Security: dependency scan, secrets scan, CodeQL
7. Preview deploy (ephemeral environment per PR)

Promotion:

- Merge to `main` → deploy to **staging** automatically; E2E suite runs against staging.
- Tag (`v*`) → manual-approval deploy to **production**; rollback = redeploy previous tag (see [runbooks](../operations/runbooks.md)).

## Alternatives Considered

- **GitFlow / release branches** — ceremony without payoff at this team size. Rejected.
- **Continuous deploy to production on every merge** — attractive, but beta users deserve a soak window on staging; manual gate stays until SLOs exist (Sprint 5 revisit).
- **CircleCI/Buildkite** — fine tools; Actions is native to where the code lives and free for this scale. Rejected.

## Consequences

- Positive: every PR is deployable and audited; quality gates are mechanical; promotion model extends to Plan B by adding service-scoped workflows.
- Negative / accepted risks: preview environments need seeded fixtures (Sprint 1 task); staging↔prod parity must be maintained.
- Follow-ups: branch protections and CI skeleton land in Sprint 0; E2E suite in Sprint 4; SLO-gated auto-promotion reconsidered in Sprint 5.
