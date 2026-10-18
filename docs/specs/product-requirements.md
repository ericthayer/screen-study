# Product Requirements Document (PRD)

- **Status:** Proposed (Sprint 0 baseline — pending approval)
- **Owner:** Product / Maintainers
- **Related:** [non-functional-requirements.md](non-functional-requirements.md), feature specs in this directory

## 1. Problem Statement

Keeping a consistent record of design/engineering work is valuable but time-consuming. UX Engineers accumulate raw artifacts (screenshots, screen recordings, voice notes) throughout the week but rarely turn them into publishable case studies because the write-up process is tedious. ScreenStudy removes that friction: capture raw artifacts, and the tool analyzes, organizes, drafts, and publishes a case study automatically.

## 2. Goals & Success Metrics

| Goal | Metric | Target (Beta) |
|---|---|---|
| Reduce effort to produce a case study | Median active time from upload → published draft | ≤ 30 minutes of human effort |
| Increase publishing consistency | Case studies published per active user per month | ≥ 2 |
| Trustworthy automation | Draft sections accepted without rewrite | ≥ 60% |
| Reliable pipeline | End-to-end success rate (upload → draft) | ≥ 95% (see NFR) |
| Accessible product | WCAG conformance | 2.2 AA (see [ADR-008](../adr/0008-accessibility-compliance-target.md)) |

Non-goals (v1): real-time collaboration, multi-user teams/orgs, video editing, custom site themes beyond the default export.

## 3. Personas

### P1 — The Solo UX Engineer (primary)
- Ships design-system components, prototypes, and front-end work weekly.
- Captures screenshots/recordings ad hoc; has a blog or portfolio (static site or CMS).
- Wants a polished case study with minimal writing; comfortable reviewing/editing AI drafts.

### P2 — The Design-Minded Developer (secondary)
- Documents side projects; less concerned with polish, more with speed.
- Wants Markdown export they can drop into any static site generator.

### P3 — The Team Lead (future)
- Wants a portfolio of team work for reviews/promotion packets. Out of scope for v1 but informs the auth and data model (see [ADR-006](../adr/0006-authn-authz-approach.md)).

## 4. User Journey (Core Loop)

1. **Capture** — user uploads media (screenshots, screen recordings, audio/video notes) → [feature-media-ingestion](feature-media-ingestion.md)
2. **Understand** — AI extracts transcripts, key insights, decisions, and outcomes → [feature-ai-analysis](feature-ai-analysis.md)
3. **Structure** — artifacts are grouped into case-study sections (context, process, decisions, outcomes) → [feature-auto-organization](feature-auto-organization.md)
4. **Draft** — a narrative draft is generated for review/edit → [feature-article-generation](feature-article-generation.md)
5. **Publish** — export/push to the user's blog or static site → [feature-automated-publishing](feature-automated-publishing.md)

## 5. Scope by Sprint (Plan A)

| Sprint | Scope |
|---|---|
| 0 | Specs + ADR baseline; CI skeleton; preview deploys |
| 1 | Media ingestion vertical slice (upload UI → API → DB + object storage) |
| 2 | AI analysis pipeline (async jobs, transcripts, insights, status UI) |
| 3 | Auto-organization + narrative draft with review/edit UX |
| 4 | Publishing (first target) + E2E hardening (a11y, performance) |
| 5 | Beta readiness (reliability, monitoring, docs) |

See [../README.md](../README.md) for the full plan comparison and the Sprint 2 re-evaluation gate.

## 6. Acceptance Criteria (Product Level)

- **AC-PRD-01:** A user can complete the full loop (upload → analyze → draft → publish) for a single case study using only the web UI.
- **AC-PRD-02:** Every automated step exposes visible status and a recoverable failure state (no silent failures).
- **AC-PRD-03:** A user can edit any AI-generated content before publishing; nothing is published without explicit user action.
- **AC-PRD-04:** The product passes a WCAG 2.2 AA audit of the core loop.
- **AC-PRD-05:** All performance budgets in the NFR are met on the Sprint 4 reference dataset.

## 7. Test Strategy (Product Level)

- Each linked feature spec defines its own acceptance criteria and test strategy; this PRD is verified by the E2E suite (Sprint 4) plus the accessibility audit and performance runs described in the NFR.
