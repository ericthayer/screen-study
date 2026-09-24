# ADR-002: Backend Architecture (Modular Monolith First)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [PRD](../specs/product-requirements.md), [ADR-004](0004-ai-orchestration-pattern.md), [ADR-005](0005-media-processing-pipeline.md), [ADR-010](0010-publishing-integration-model.md), [backend-architecture](../architecture/backend-architecture.md)

## Context

The delivery-plan comparison favors Plan A ("MVP Monolith First") for a small team with high uncertainty: fastest delivery, lowest ops overhead. The risk is later refactoring cost; that is mitigated by explicit **modular boundary discipline** so modules can be extracted into services (Plan B) if the Sprint 2 re-evaluation triggers fire.

## Decision

**Adopt a modular monolith: a single deployable backend (Node.js/TypeScript, Fastify) with four internal modules mirroring the bounded contexts — `ingestion`, `analysis`, `composition`, `publishing` — plus a worker process (same codebase, separate entrypoint) for async jobs.**

Modular boundary discipline (enforced by lint rules + code review):

1. Each module owns its own tables; cross-module reads go through the owning module's application service, never direct table access.
2. Modules communicate through explicit service interfaces and domain events (in-process pub/sub now, swappable for a bus).
3. Storage access only through the storage abstraction (see [ADR-003](0003-database-strategy.md)).
4. No long-running work in request handlers (see [ADR-004](0004-ai-orchestration-pattern.md)).

## Alternatives Considered

- **Service-oriented from day one (Plan B)** — better scaling/parallelism, but multi-service CI/CD, distributed tracing, and local dev complexity before product-market fit. Rejected for v1; re-evaluation gate defined in [NFR §6](../specs/non-functional-requirements.md).
- **Serverless functions** — great scaling story per-endpoint, but chunked uploads, long-running media jobs, and local dev parity add friction; cold starts conflict with NFR-P9. Rejected.
- **Rails/Laravel/Django monolith** — productive, but splits the codebase across two languages (frontend TS) and weakens code sharing of contracts. Rejected on team skillset and contract-sharing grounds.

## Consequences

- Positive: one deployable, one pipeline, trivial local dev; contracts shared as TypeScript types; extraction path to services preserved.
- Negative / accepted risks: scaling is vertical + worker-count until extraction; discipline rules require enforcement to stay real.
- Follow-ups: re-evaluate at end of Sprint 2 per the Plan A → Plan B gate (NFR §6); document contexts in [backend-architecture](../architecture/backend-architecture.md).
