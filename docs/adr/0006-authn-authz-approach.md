# ADR-006: AuthN/AuthZ Approach

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [NFR §4](../specs/non-functional-requirements.md), [feature-automated-publishing](../specs/feature-automated-publishing.md), [threat model](../quality/security-threat-model.md)

## Context

v1 serves single-user accounts (persona P1/P2), but P3 (teams) looms later. Media is private user content; publishing needs delegated access to user Git repos. Rolling custom auth is a security risk; the choice is which managed/standard approach fits a small team.

## Decision

**Use managed OIDC authentication (Auth0 or equivalent) with session cookies (HttpOnly, Secure, SameSite=Lax) for the SPA; authorization is per-user resource scoping enforced in the service layer; third-party integrations (Git) use OAuth with minimal scopes and encrypted token storage.**

Details:

- **AuthN:** OIDC Authorization Code + PKCE; sessions via server-side cookie; CSRF token for mutating requests.
- **AuthZ:** every query scoped by `user_id` (defense in depth: service-layer checks + Postgres row-level security on multi-tenant tables). Single role (`owner`) in v1; the model reserves `org_id` NULL-able columns so team roles (viewer/editor/admin) can be added without migration pain.
- **Integration tokens:** publishing credentials stored encrypted at rest (KMS-managed key), scoped per target, revocable; never exposed to the client after the OAuth flow.
- **Service auth:** worker processes authenticate to internal APIs with short-lived machine tokens if/when extraction happens (Plan B).

## Alternatives Considered

- **Custom email/password auth** — full control, but password storage, resets, MFA are a security liability for a small team. Rejected.
- **API keys / bearer tokens for the SPA** — XSS-exfiltratable; cookies with CSRF protection are the safer default for a browser app. Rejected for first-party UI.
- **Full RBAC/ABAC now** — no team features in v1; adds complexity without users. Deferred; schema reserves the shape.

## Consequences

- Positive: no credential storage; MFA/social login come free; cookies avoid token-in-localStorage XSS exposure; per-user scoping is simple to audit.
- Negative / accepted risks: vendor dependency (mitigated by OIDC standard); cookie auth requires CSRF discipline; RLS adds migration care.
- Follow-ups: pick the OIDC vendor in Sprint 0/1; threat-model auth flows (Sprint 5 closure); document token-encryption runbook.
