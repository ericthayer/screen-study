# ADR-010: Publishing Integration Model (Static Export First, Behind an Adapter Seam)

- **Status:** Accepted (MVP scope: filesystem publisher; Git-push/CMS adapter deferred to Sprint 4)
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-002](0002-backend-architecture.md), [ADR-003](0003-database-strategy.md), DECISIONS.md D4, D5, D9

## Context

Generated articles need a publishing target. Options range from static export (droppable into any static site generator) to API push (hosted CMS) to Git-push (content PRs). The PR #2 plan chose "static export first" with an adapter interface; the MVP implements exactly that, with the Git adapter deferred.

## Decision

**Publishing writes a static-export directory per article via the `PublishingAdapter` interface (`src/server/services/publish.ts`). The first implementation is `FilesystemPublisher`; drafts are Markdown with YAML frontmatter, versioned in the `article_drafts` table.**

- Publish output: `PUBLISH_DIR/<slug>/` containing `index.md` (Markdown + frontmatter: `title`, `date`, `draft`) plus the referenced media files, with media references rewritten to relative `./file` links.
- The adapter exposes `render / dryRun / publish / retract`; `POST /api/drafts/:id/publish/dry-run` previews a publish without writing.
- Unpublish is a directory delete; publish/unpublish history is tracked in SQLite (`publish_records`).
- Editing a draft creates a new version rather than mutating in place.

## Alternatives Considered

- **Direct CMS API push** — immediate "published URL," but locks the MVP to one vendor and requires network + credentials. Rejected as the first target; viable as a future adapter.
- **Git-push publishing (content PRs)** — excellent review workflow; deferred to Sprint 4 as a new `PublishingAdapter` implementation (the seam is already in place).
- **Hard-coded filesystem writes in the route** — simplest, but violates ADR-002 boundary discipline and makes future targets expensive. Rejected.

## Consequences

- Positive: output drops directly into Astro/Hugo/Eleventy content collections — no lock-in; publish is testable offline via dry-run; retract is trivial and audited.
- Negative / accepted risks: no hosted URL or CDN — the operator runs their own static site; publish history is local-only.
- Follow-ups / re-evaluation triggers: Sprint 4 — implement the Git-push/CMS adapter behind the existing `PublishingAdapter` interface, touching no call sites.
