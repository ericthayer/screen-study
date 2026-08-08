# Feature Spec: Automated Publishing

- **Status:** Proposed
- **Sprint (Plan A):** 4 — Publishing + End-to-End Hardening
- **Related ADRs:** [ADR-010](../adr/0010-publishing-integration-model.md), [ADR-002](../adr/0002-backend-architecture.md), [ADR-006](../adr/0006-authn-authz-approach.md)
- **ADR impact check:** The first publishing target is decided in ADR-010 (pending). A second target requires amending ADR-010 and a new spec section.

## 1. Summary

Approved drafts are published to the user's target: v1 = static export (Markdown + media bundle, optionally pushed to a Git-backed site repo). Publishing is always an explicit user action with a dry-run preview.

## 2. User Stories

- US-PUB-01: As a user, I can export a case study as a self-contained Markdown bundle (front matter + media + alt text).
- US-PUB-02: As a user with a Git-backed blog, I can push the bundle as a commit/PR to my repo.
- US-PUB-03: As a user, I see a dry-run preview of exactly what will change before anything is published.
- US-PUB-04: As a user, I can unpublish/retract content I previously pushed.
- US-PUB-05: As a user, I get a clear record of what was published, where, and when.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-PUB-01 | Publishing requires draft Groundedness = 2 (see article-generation rubric) and explicit user confirmation |
| FR-PUB-02 | Export format: directory with `index.md` (YAML front matter), `media/` assets, alt text embedded for every image |
| FR-PUB-03 | Git adapter: commit to a user-configured repo/branch, or open a PR; credentials via OAuth token with minimal scopes (ADR-006) |
| FR-PUB-04 | Dry-run renders the exact diff/file list before confirming |
| FR-PUB-05 | Publish events recorded (`publications` table): target, commit SHA/URL, revision published, timestamp |
| FR-PUB-06 | Retract creates a follow-up commit/PR removing the content |
| FR-PUB-07 | Publishing is an async job with status tracking and idempotent retries (safe to retry without duplicate commits) |

## 4. API Contract (extract)

```
GET  /api/v1/publishing/targets                  → configured targets
POST /api/v1/drafts/{id}/publish/dry-run         → returns diff/file list
POST /api/v1/drafts/{id}/publish                 → enqueue publish job
GET  /api/v1/publications/{id}                   → status + resulting URLs
POST /api/v1/publications/{id}/retract           → enqueue retract job
```

## 5. Acceptance Criteria

- **AC-PUB-01:** Export bundle passes a schema check: front matter valid, all referenced media present, all images have non-empty alt text.
- **AC-PUB-02:** Dry-run output matches the actual pushed commit exactly (byte-for-byte file list).
- **AC-PUB-03:** Retry of a publish job after a network failure produces exactly one commit (idempotency key).
- **AC-PUB-04:** Retract removes the content and records the retraction in the publications log.
- **AC-PUB-05:** Publishing flow is keyboard-operable end to end; confirmation dialogs follow WCAG 2.2 focus rules.
- **AC-PUB-06:** E2E flow upload → analyze → organize → draft → publish passes on the reference dataset (AC-PRD-01).

## 6. Test Strategy

- Unit: bundle builder, front-matter serializer, idempotency logic.
- Contract: adapter interface tests against recorded Git API fixtures.
- Integration: publish to a throwaway test repo; retract; event log assertions.
- E2E: full core loop on reference dataset.
- Security: token scope verification; path-traversal and filename-sanitization tests on the bundle builder (see [threat model](../quality/security-threat-model.md)).

## 7. Out of Scope (Sprint 4)

CMS API targets (WordPress/Medium/Dev.to), scheduled publishing, custom templates/themes, multi-target fan-out.
