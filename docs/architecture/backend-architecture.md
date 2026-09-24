# Backend Architecture (Context & Containers)

- **Status:** Draft (Sprint 0 baseline)
- **Related:** [ADR-002](../adr/0002-backend-architecture.md), [ADR-004](../adr/0004-ai-orchestration-pattern.md), [ADR-005](../adr/0005-media-processing-pipeline.md), [ADR-006](../adr/0006-authn-authz-approach.md)

## Module Map (bounded contexts inside the monolith)

```mermaid
flowchart TB
    subgraph monolith[Backend (modular monolith)]
        http[HTTP layer<br/>Fastify routes + OpenAPI]
        subgraph ingestion[ingestion]
            ingSvc[IngestionService]
        end
        subgraph analysis[analysis]
            anlSvc[AnalysisService]
            gw[AI Gateway]
        end
        subgraph composition[composition]
            cmpSvc[CompositionService]
        end
        subgraph publishing[publishing]
            pubSvc[PublishingService]
            adapters[PublishingAdapters]
        end
        shared[shared: auth · storage · events · jobs]
    end
    http --> ingSvc & anlSvc & cmpSvc & pubSvc
    ingSvc & anlSvc & cmpSvc & pubSvc --> shared
    anlSvc --> gw
    pubSvc --> adapters
```

## Boundary Rules (enforced, per ADR-002)

- Each module owns its tables (see [data-model](data-model.md)); cross-module reads via the owning module's service interface.
- Cross-module async coordination via domain events on the in-process bus (payloads versioned, bus-swappable).
- Storage only via `StorageService`; AI calls only via `AI Gateway`; third-party pushes only via `PublishingAdapters`.
- HTTP handlers never perform long-running work — they enqueue jobs (ADR-004).

## Request Handling

1. AuthN middleware (session cookie verify, OIDC) → request context with `user_id`, `correlation_id`.
2. Route validation against OpenAPI schemas (fail fast, RFC 9457 errors).
3. Service layer enforces AuthZ scoping (`user_id`) — no route returns cross-user data (NFR-S1).
4. Writes that trigger pipeline work enqueue jobs in the same DB transaction (transactional enqueue, ADR-005).

## Worker

Same codebase, separate entrypoint: polls the Postgres-backed queue (Graphile Worker), per-type concurrency limits, exponential backoff with jitter, idempotent handlers keyed `(job_type, media_id, payload_hash)`.

## AI Gateway

Single choke point for provider calls: secret lookup, per-user rate limiting, model routing, token/cost logging, response schema validation, recorded-fixture mode for tests (NFR-S3, AC-ANL-06).

## Event/Audit Log

Domain events (`media.ready`, `analysis.started/succeeded/failed`, `grouping.completed`, `draft.generated`, `publication.published/retracted`) are persisted as an append-only audit log from day one — doubles as debugging trail and Plan B event-bus outbox.

## Environments & Config

12-factor config via environment variables; local dev via docker-compose (Postgres + MinIO + mailhog); secrets from the platform secret store, never committed (NFR-S5).
