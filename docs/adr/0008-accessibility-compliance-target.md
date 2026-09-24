# ADR-008: Accessibility Compliance Target (WCAG 2.2 AA)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [NFR §2](../specs/non-functional-requirements.md), [accessibility checklist](../quality/accessibility.md), [ADR-001](0001-frontend-architecture.md), [ADR-007](0007-ci-cd-pipeline.md)

## Context

ScreenStudy is a productivity tool; excluding keyboard and assistive-tech users would exclude part of its core audience. Accessibility debt is cheapest to avoid at the component layer and most expensive to retrofit. The question is which conformance level is the contractual baseline.

## Decision

**WCAG 2.2 Level AA is the compliance baseline for all user-facing surfaces, enforced by design-system choices, automated CI checks, and a manual audit gate before beta.**

Implications:

- Component system built on accessible primitives (Radix) per ADR-001; no custom widgets without an a11y review.
- Automated: axe-core in CI on key routes (upload, jobs, organization, editor, publish) — critical violations fail the build.
- Manual: keyboard walkthrough + screen-reader smoke script per feature spec; full audit pass in Sprint 4 (AC-PRD-04).
- Content: alt-text workflow is a first-class feature (NFR-A4) — AI-suggested, human-approved, required at publish time (AC-PUB-01).
- New WCAG 2.2 AA criteria tracked explicitly: focus appearance, dragging movements (keyboard reorder alternatives in auto-organization), accessible authentication, target size.

## Alternatives Considered

- **WCAG 2.1 AA** — the 2.2 delta is small for a greenfield app and mostly affects interactions we're building anyway (drag-and-drop, auth). Rejected as unnecessarily dated.
- **AAA aspiration** — valuable where feasible (e.g., contrast), but not contractual; some criteria (e.g., sign-language for all video) are out of reach. Adopted opportunistically, not as baseline.
- **"Best effort" without a target** — unenforceable and unmeasurable. Rejected.

## Consequences

- Positive: clear, testable bar; component choices already support it; publish-time alt-text requirement improves output quality for everyone.
- Negative / accepted risks: drag-and-drop must ship keyboard alternatives (more UI work); audit time in Sprint 4 is a real cost.
- Follow-ups: maintain [accessibility checklist + test matrix](../quality/accessibility.md); audit findings tracked as issues linked to AC-PRD-04.
