# ADR-007: CI/CD Pipeline (PR Gates: Lint, Typecheck, Test, Build)

- **Status:** Accepted (PR-gates portion; environment promotion model is not applicable to a local tool)
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** DECISIONS.md D7

## Context

The repo needs automated quality gates so regressions are caught before merge. The PR #2 plan proposed a full promotion model (PR gates → staging → tagged production); for a local single-user tool with no deployed environments, only the PR-gate portion applies.

## Decision

**Every PR runs four gates in GitHub Actions CI: `npm run lint` (ESLint flat config), `npm run typecheck` (`tsc`), `npm test` (Vitest unit + API pipeline tests), and `npm run build` (server bundle + Vite client build).**

- Tests are hermetic: they use the offline `local` AI provider and temp data directories, so CI needs no secrets or network access (per ADR-005).
- There are no staging/production environments to promote to; releasing is publishing artifacts to `PUBLISH_DIR` from a running instance (see ADR-010).

## Alternatives Considered

- **Full staged promotion (PR #2 proposal)** — staging/prod environments don't exist for a local tool. Deferred until (if ever) the app is hosted.
- **Fewer gates (tests only)** — type errors and build breakage would slip through; the four commands are fast enough that gating on all of them is cheap. Rejected.

## Consequences

- Positive: regressions in lint, types, tests, or build block merge; CI is fully offline and reproducible.
- Negative / accepted risks: no deployment automation (none needed); no accessibility or performance gates yet — those land with ADR-008/ADR-009 work.
- Follow-ups: add axe-based accessibility CI with the Sprint 4 accessibility hardening (ADR-008); add performance budget checks with the Sprint 2/5 observability work (ADR-009).
