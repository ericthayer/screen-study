# Feature Spec: Article Generation

- **Status:** Proposed
- **Sprint (Plan A):** 3 — Auto-Organization + Narrative Draft
- **Related ADRs:** [ADR-004](../adr/0004-ai-orchestration-pattern.md), [ADR-005](../adr/0005-media-processing-pipeline.md), [ADR-001](../adr/0001-frontend-architecture.md)
- **ADR impact check:** None beyond baseline.

## 1. Summary

From an organized case study (sections + artifacts + insights), the system generates a narrative draft of a UX Engineering case study article. The user reviews and edits in a structured editor; nothing publishes without explicit approval (AC-PRD-03).

## 2. User Stories

- US-GEN-01: As a user, I get a complete first draft grounded in my artifacts and insights, not generic filler.
- US-GEN-02: As a user, every factual claim in the draft is traceable to an artifact, transcript span, or insight.
- US-GEN-03: As a user, I can edit any section in a distraction-light editor with autosave and version history.
- US-GEN-04: As a user, I can regenerate a single section with guidance ("shorter", "more technical") without losing my edits elsewhere.
- US-GEN-05: As a screen-reader user, I can navigate the draft by headings and edit with standard controls.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-GEN-01 | Draft job consumes the grouping output + insights; produces Markdown with YAML front matter (title, summary, tags, date) |
| FR-GEN-02 | Claims carry source references (`source: media_id/insight_id/span`) stored alongside the draft; UI renders "why is this here" affordances |
| FR-GEN-03 | Drafts are versioned; every generation and manual edit creates a revision; users can diff/restore |
| FR-GEN-04 | Section-level regeneration accepts user guidance and preserves locked (user-edited) sections |
| FR-GEN-05 | Generation is an async job with visible status (ADR-004); failures are retryable without losing prior drafts |
| FR-GEN-06 | Guardrails: no claims without sources; flag low-confidence content inline; never invent metrics/quotes (see rubric below) |

## 4. Quality Scoring Rubric (Guardrails)

Score each generated draft 0–2 per axis; below threshold → banner "draft needs review" and highlighted sections:

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| Groundedness | Unsupported claims | Most claims sourced | Every claim sourced |
| Structure | Missing core sections | All sections, uneven depth | Balanced, complete narrative |
| Voice | Off-persona/generic | Mostly user voice | Matches user style samples |

Threshold: total ≥ 4, Groundedness must be 2 before publishing is enabled.

## 5. API Contract (extract)

```
POST /api/v1/case-studies/{id}/drafts           → enqueue generation
GET  /api/v1/drafts/{id}                        → draft + sources + score
PATCH /api/v1/drafts/{id}                       → save edits (new revision)
POST /api/v1/drafts/{id}/sections/{sid}/regen   → regenerate section (guidance in body)
GET  /api/v1/drafts/{id}/revisions              → version history
```

## 6. Acceptance Criteria

- **AC-GEN-01:** Fixture case study produces a draft with all six sections and 100% of factual claims carrying a source reference.
- **AC-GEN-02:** Regenerating one section leaves other sections byte-identical.
- **AC-GEN-03:** Edit → autosave → reload restores content; version history shows the revision; restore works.
- **AC-GEN-04:** A forced low-groundedness generation (adversarial fixture) is flagged and publishing remains disabled until resolved.
- **AC-GEN-05:** Editor is heading-navigable by screen reader; no axe critical violations on the review route.
- **AC-GEN-06:** Draft generation for a 20-artifact case study completes within NFR-P8.

## 7. Test Strategy

- Unit: prompt assembly, source-reference binding, rubric scoring, revision diff.
- Worker tests: recorded-fixture generations; determinism checks on structure.
- Contract: draft schema + sources schema tests (consumed by publishing).
- Integration: generation job end-to-end from grouping output; revision persistence.
- E2E: generate → edit → regenerate section → review score.
- Accessibility: axe + screen-reader smoke script on editor.

## 8. Out of Scope (Sprint 3)

Style training from past articles, multi-language output, collaborative editing/commenting.
