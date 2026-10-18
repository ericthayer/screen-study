# ADR-008: Accessibility Compliance Target (WCAG 2.2 AA)

- **Status:** Deferred — *Target: Sprint 4*
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-001](0001-frontend-architecture.md), DECISIONS.md "Explicitly deferred"

## Context

ScreenStudy's UI involves dialogs (draft review/edit), status tracking, and media browsing — all areas with well-known accessibility failure modes. The PR #2 plan set WCAG 2.2 AA as the compliance target with a component system (Radix), automated axe checks in CI, and a manual audit. Building that during Sprint 1 would have delayed the core pipeline.

## Decision

**The compliance target remains WCAG 2.2 AA, but hardening is deferred to Sprint 4.** The MVP ships only baseline behavior in the review dialog (focus management + Esc handling). There is no Radix adoption, no axe CI gate, and no manual audit yet.

## Alternatives Considered

- **Full AA hardening in the MVP (PR #2 schedule)** — the right end state, but it competes with the core upload → analyze → draft → publish loop for Sprint 1 capacity. Deferred.
- **No accessibility target** — unacceptable for a tool that produces publishable content and may gain more users. Rejected.

## Consequences

- Positive: Sprint 1 stayed focused on the core pipeline; the target and test plan are already chosen.
- Negative / accepted risks: the current UI likely has AA violations (contrast, focus order, ARIA on custom widgets); known and accepted until Sprint 4.
- Follow-ups / re-evaluation triggers: Sprint 4 — adopt the component system, add automated axe checks to CI (extends ADR-007), run the manual audit against the per-route test matrix.
