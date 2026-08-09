# ADR-001: Frontend Architecture (React + Vite SPA)

- **Status:** Accepted
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-002](0002-backend-architecture.md), DECISIONS.md D1

## Context

ScreenStudy needs a web client for uploading media, tracking analysis jobs, reviewing/editing drafts, and publishing. The team is small and the app is a single-user local tool, so build tooling and iteration speed matter more than framework ecosystem breadth.

## Decision

**The web client is a React single-page application built with Vite, written in TypeScript, living in the same monorepo as the backend (`src/web/`).**

- Vite dev server runs on :5173 and proxies API/media requests to the Fastify server on :3000.
- Production build (`vite build`) outputs static assets that the Fastify server serves directly.
- The data model (`src/shared/types.ts`) is shared between client and server without code generation.

## Alternatives Considered

- **Next.js / SSR framework** — server rendering and routing conventions are unnecessary for a local single-user tool; adds deployment complexity. Rejected for the MVP.
- **Plain HTML/vanilla JS** — no component model or state management; the review/edit UX would be painful to build and maintain. Rejected.
- **Vue/Svelte** — viable, but React's ecosystem (testing, component libraries for the future accessibility work in ADR-008) is the safer default.

## Consequences

- Positive: instant dev feedback; one language across the stack; simple production build with no separate frontend deployment.
- Negative / accepted risks: no SSR/SEO (irrelevant for a local tool); React bundle size is accepted for the MVP.
- Follow-ups: component-system and accessibility hardening decisions land with [ADR-008](0008-accessibility-compliance-target.md) work in Sprint 4.
