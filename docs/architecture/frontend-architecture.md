# Frontend Architecture

- **Status:** Draft (Sprint 0 baseline)
- **Related:** [ADR-001](../adr/0001-frontend-architecture.md), [ADR-008](../adr/0008-accessibility-compliance-target.md), [ADR-009](../adr/0009-performance-budgets-observability.md)

## Stack

React + TypeScript + Vite SPA · React Router · TanStack Query (server state) · Radix UI primitives + Tailwind (component system) · Zod schemas shared with backend contracts.

## Route Map (by sprint)

| Route | Purpose | Sprint |
|---|---|---|
| `/login`, `/auth/callback` | OIDC flow | 1 |
| `/` | Dashboard: recent case studies, job summary | 1 |
| `/upload` | Multi-file upload, progress, validation | 1 |
| `/media` + `/media/:id` | Library, metadata, alt-text editing | 1–2 |
| `/jobs` | Analysis job status timeline, retry | 2 |
| `/case-studies/:id/organize` | Sections, drag-and-drop + keyboard reorder, rationale | 3 |
| `/case-studies/:id/draft` | Structured editor, sources panel, revisions, regen | 3 |
| `/case-studies/:id/publish` | Dry-run diff, target config, publication log | 4 |
| `/settings` | Profile, publishing targets, connected accounts | 4 |

## Architectural Rules

1. **Server state vs UI state:** TanStack Query owns all server data (caching, polling for job status); local UI state stays in components or small stores. No global server-state duplication.
2. **Contract-first:** API types generated from the OpenAPI document; forms validated with shared Zod schemas. Contract drift fails CI (ADR-007).
3. **Accessibility is structural:** every interactive pattern ships with keyboard support and ARIA wiring from the design system — not per-page bolt-ons (ADR-008). Route changes move focus to the page `<h1>`; async status uses `aria-live="polite"` regions.
4. **Performance budgets:** route-level code splitting; initial bundle ≤ 200 KB gz (NFR-P2); media lists virtualized; images lazy-loaded with dimensions reserved.
5. **Upload pipeline:** resumable chunker with retry/backoff; per-file state machine mirrors the API contract in [feature-media-ingestion](../specs/feature-media-ingestion.md).

## Component System

- Primitives: Radix (Dialog, DropdownMenu, Tabs, Toast, Progress, DragHandle patterns).
- Composed app components: `UploadDropzone`, `UploadProgressList`, `JobStatusTimeline`, `SectionBoard`, `DraftEditor`, `SourcesPanel`, `DiffPreview`.
- Naming/testing: each composed component ships with unit tests + axe test; story/storybook-style catalog added in Sprint 1 (optional, not contractual).

## Error & Empty States

Every query surface defines loading / error (with retry) / empty states. Failures from async jobs link to the jobs timeline — no silent background failure (AC-PRD-02).
