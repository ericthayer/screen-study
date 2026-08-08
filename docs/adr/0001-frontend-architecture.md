# ADR-001: Frontend Architecture (SPA Framework + Component System)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [PRD](../specs/product-requirements.md), [ADR-008](0008-accessibility-compliance-target.md), [ADR-009](0009-performance-budgets-observability.md), [frontend-architecture](../architecture/frontend-architecture.md)

## Context

ScreenStudy's UI is an authenticated, highly interactive app: chunked uploads with progress, job status timelines, drag-and-drop organization, and a structured draft editor. A content-site approach (MPA/SSG) fits poorly; the publishing targets are outputs, not the app itself. The stack must support strong accessibility primitives and a strict performance budget (NFR-P1/P2).

## Decision

**Adopt a React SPA built with Vite + TypeScript, with an accessible component system built on Radix UI primitives + Tailwind CSS, TanStack Query for server state, and React Router for routing.**

> Status is **Proposed** until Sprint 0 sign-off. This ADR records the leading option and its rationale so work can begin; the decision is confirmed or amended at the Sprint 0 spec gate.

## Alternatives Considered

- **Next.js (React meta-framework)** — SSR/SEO strengths are irrelevant for an authenticated app; adds server runtime complexity and lock-in. Rejected for v1; the exported *articles* get SEO from the publishing target, not the app.
- **Vue/Svelte + Vite** — excellent ergonomics, but smaller ecosystem of battle-tested accessible primitives and hiring familiarity. Rejected on ecosystem risk.
- **HTMX/Alpine MPA** — lowest complexity, but drag-and-drop organization, live job timelines, and the editor push well past its sweet spot. Rejected.
- **Material UI / Chakra instead of Radix+Tailwind** — faster start, heavier bundle and harder visual identity. Rejected on NFR-P2 budget and design flexibility.

## Consequences

- Positive: large ecosystem; first-class a11y primitives (Radix) aligned with WCAG 2.2 AA target; small initial bundle (Vite code-splitting, no server runtime); TypeScript end to end.
- Negative / accepted risks: SPA means client-side routing/a11y focus management is our responsibility (see [frontend-architecture](../architecture/frontend-architecture.md)); no SSR safety net if a future marketing site appears (build it separately).
- Follow-ups: component inventory in Sprint 1; bundle budget enforced in CI (ADR-009).
