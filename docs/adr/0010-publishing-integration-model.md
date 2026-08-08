# ADR-010: Publishing Integration Model (Static Export First, Adapter Interface)

- **Status:** Proposed
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [feature-automated-publishing](../specs/feature-automated-publishing.md), [ADR-006](0006-authn-authz-approach.md), [ADR-002](0002-backend-architecture.md)

## Context

Users publish to heterogeneous targets (static site generators, Git-backed blogs, CMSs). Building API-push integrations first couples the roadmap to third-party APIs before the core loop is proven; export-only forever under-delivers "automated publishing". The decision is sequencing and architecture, not ambition.

## Decision

**v1 ships static export as the canonical format, plus one Git push adapter (commit/PR to a user repo) as the first automated target. All targets implement a `PublishingAdapter` interface; additional targets (CMS APIs) are added by amending this ADR.**

Canonical export (target-independent):

```
<slug>/
  index.md        # YAML front matter (title, summary, tags, date, draft: false)
  media/          # optimized copies of referenced assets
```

- Alt text is mandatory in the bundle (AC-PUB-01) — accessibility is enforced at the export boundary.
- The **Git adapter** (first target) commits the bundle to a configured repo/branch or opens a PR, using OAuth tokens with minimal scopes (ADR-006).
- The adapter interface (`render(draft) → bundle`, `dryRun(target, bundle) → diff`, `publish(target, bundle) → receipt`, `retract(publication) → receipt`) keeps `publishing` module internals pluggable per ADR-002 discipline.
- Idempotency keys make retries safe (AC-PUB-03).

## Alternatives Considered

- **API push first (WordPress/Medium/Dev.to)** — fastest "magic", but each target has auth models, rate limits, and content-model quirks; proves less of the core loop. Rejected as the *first* target; retained as adapter roadmap.
- **Export-only (download ZIP)** — zero integration risk but manual last mile; the Git adapter is a small step with big perceived automation value. Rejected as the whole story.
- **Hosted publishing (we host the blog)** — becomes a different product. Rejected.

## Consequences

- Positive: every static-site user (Hugo/Astro/Next/Eleventy/GitHub Pages) is served by one format; dry-run diff is natural in Git; adapters are independently testable against recorded fixtures.
- Negative / accepted risks: Git adapter UX must handle non-technical git states (branch protection, conflicts) — dry-run + PR mode mitigates; CMS users wait for later adapters.
- Follow-ups: second target chosen from user feedback (NFR §6 tracks "publishing integration complexity" as a Plan B trigger); adapter contract tests in Sprint 4.
