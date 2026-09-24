# Feature Spec: Auto-Organization

- **Status:** Proposed
- **Sprint (Plan A):** 3 — Auto-Organization + Narrative Draft
- **Related ADRs:** [ADR-002](../adr/0002-backend-architecture.md), [ADR-003](../adr/0003-database-strategy.md), [ADR-004](../adr/0004-ai-orchestration-pattern.md)
- **ADR impact check:** None beyond baseline. Data model adds `case_studies`/`sections` tables — see [../architecture/data-model.md](../architecture/data-model.md).

## 1. Summary

Analyzed artifacts are grouped into a case-study structure — context, goals, process, decisions, outcomes, artifacts — giving the user an organized outline before drafting. The user can move artifacts between sections and rename/merge sections.

## 2. User Stories

- US-ORG-01: As a user, related artifacts are automatically grouped into a case study so I don't sort them by hand.
- US-ORG-02: As a user, artifacts are placed into sensible default sections with a stated rationale.
- US-ORG-03: As a user, I can reorganize sections and move artifacts; my choices override the AI on future runs.
- US-ORG-04: As a user, I can split one batch into multiple case studies when the artifacts don't belong together.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-ORG-01 | Grouping job runs after analysis completes for a batch (artifact set selected by user or upload session) |
| FR-ORG-02 | Default section taxonomy: Context, Goals, Process, Decisions, Outcomes, Gallery; taxonomy is configurable in a later iteration |
| FR-ORG-03 | Each placement records a machine-readable rationale (which insights/signals drove it) for transparency |
| FR-ORG-04 | Manual overrides persist and are treated as ground truth for re-runs (AI does not undo user decisions) |
| FR-ORG-05 | Section order is user-editable (drag-and-drop + keyboard reorder) |
| FR-ORG-06 | Ungrouped/low-confidence artifacts land in an "Unsorted" bucket with a prompt to triage |

## 4. Quality Scoring Rubric (Guardrails)

Each grouping is scored 0–2 on each axis; a case-study grouping below threshold is flagged for user review before drafting:

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| Coverage | Artifacts missing | All placed, some low-confidence | All placed with confidence |
| Coherence | Sections mixed-topic | Mostly coherent | Single clear narrative thread |
| Evidence | Placements lack rationale | Rationale for some | Rationale for all placements |

Threshold: total ≥ 4 with no axis at 0 → "ready to draft"; otherwise "needs review".

## 5. Acceptance Criteria

- **AC-ORG-01:** Given the fixture batch (20 artifacts), grouping produces sections matching the expected mapping within 80% agreement.
- **AC-ORG-02:** Every automated placement exposes its rationale in the UI.
- **AC-ORG-03:** A manual move survives a re-run of the grouping job (override respected).
- **AC-ORG-04:** Section reorder and artifact move are fully keyboard-operable; live region announces changes (NFR-A2/A3).
- **AC-ORG-05:** A deliberately incoherent batch is flagged "needs review" by the rubric, not silently drafted.

## 6. Test Strategy

- Unit: rubric scoring, override merge logic, taxonomy validation.
- Integration: grouping job over recorded analysis fixtures; rationale persistence.
- E2E: group → reorder → move artifact → verify persistence and accessibility.
- Contract: grouping output JSON schema test (feeds drafting).

## 7. Out of Scope (Sprint 3)

Automatic splitting heuristics across weeks/projects, shared/team taxonomies, custom section templates.
