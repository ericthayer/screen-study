# ADR-006: AuthN/AuthZ Approach

- **Status:** Deferred — *Target: when multi-user hosting is needed*
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-002](0002-backend-architecture.md), [ADR-003](0003-database-strategy.md), DECISIONS.md "Explicitly deferred"

## Context

The PR #2 plan proposed OIDC authentication with per-user data scoping. ScreenStudy's MVP is explicitly a **single-user local tool** (see ADR-003: SQLite + local disk, no external services). Adding an identity provider, sessions, and a `users` table would cost complexity and deliver no value to the target user.

## Decision

**No authentication or per-user authorization in the MVP.** The app assumes a single trusted operator on a local machine. There is no `users` table, no session layer, and no per-user scoping in the schema or API.

## Alternatives Considered

- **OIDC with per-user scoping (PR #2 proposal)** — correct for a hosted multi-user product; pure overhead for a local single-user tool. Deferred, not rejected: it is the designated design when multi-user hosting becomes a requirement.
- **HTTP basic auth / shared token** — cheap protection, but the app binds to localhost and the threat model assumes a trusted operator. Not needed now; trivially addable at the reverse-proxy or server level later.

## Consequences

- Positive: no identity infrastructure to build, run, or secure; schema and API stay simple.
- Negative / accepted risks: the app must not be exposed to a network as-is; anyone with access to the running server has full access to all data.
- Follow-ups / re-evaluation triggers: adopt the OIDC + per-user scoping design (and a `users` table) when multi-user hosting is needed — the same trigger that moves storage to Postgres per ADR-003.
