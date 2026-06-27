# Day 2 Sign-Off: UX and State Model

Date: 2026-06-27
Status: Approved for MVP implementation

## Purpose

This document locks the MVP wizard state model for **Capture -> Organize -> Draft -> Publish**, defines the single primary CTA for each step, and defines interruption and resume behavior.

## UX model

- The MVP uses a linear 4-step wizard with one current step at a time.
- Users can move backward to revise prior work, but forward progress is guarded by step-level completion rules.
- Each step exposes exactly **one** primary CTA. Secondary actions may exist for save, back, exit, or edit, but none may compete visually with the primary CTA.

## Canonical state machine

### Wizard-level states

| State | Meaning | Entry condition | Exit condition |
| --- | --- | --- | --- |
| `capture` | Collect raw evidence for the current story | New sprint starts or resumed sprint has no completed capture step | User has at least one usable artifact or note and advances |
| `organize` | Curate and shape evidence into one story | Capture is complete | Evidence set is coherent enough for narrative generation and user advances |
| `draft` | Generate and refine the case-study draft | Organize is complete | A draft exists, weak areas are visible, and user advances |
| `publish` | Review, approve, export, and create PR | Draft is complete | Approved draft produces either a successful PR result or a surfaced blocking error |
| `done` | Publish flow is complete for the sprint | Publish succeeds and PR metadata is stored | User starts a new sprint or duplicates the completed draft into a new sprint |

### Transition rules

| From | To | Guard |
| --- | --- | --- |
| `capture` | `organize` | At least one usable captured item exists |
| `organize` | `capture` | User chooses to go back |
| `organize` | `draft` | One story is selected and the supporting evidence set is coherent enough to draft |
| `draft` | `organize` | User chooses to revise evidence selection or story framing |
| `draft` | `publish` | A draft exists and is ready for human review |
| `publish` | `draft` | User chooses to edit before approval or publish is blocked by missing/invalid content |
| `publish` | `done` | Approval is explicit, export succeeds, branch/commit/PR creation succeeds |

## Step-level completion rules

### 1. Capture

- **Goal:** gather enough raw evidence to start shaping a story.
- **Completion rule:** at least one usable artifact or note exists in the current sprint.
- **Primary CTA:** **Continue to Organize**
- **Allowed secondary actions:** save and exit, delete captured item, edit captured item.

### 2. Organize

- **Goal:** select one publishable story and trim the evidence set to match it.
- **Completion rule:** one story is selected and its evidence set is ordered and coherent enough to draft from.
- **Primary CTA:** **Generate Draft**
- **Allowed secondary actions:** back to Capture, reorder evidence, remove evidence, save and exit.

### 3. Draft

- **Goal:** produce a portfolio-signal narrative with visible weak spots.
- **Completion rule:** a draft exists with the required sections and is ready for explicit human review.
- **Primary CTA:** **Review for Publish**
- **Allowed secondary actions:** regenerate draft, edit draft, back to Organize, save and exit.

### 4. Publish

- **Goal:** enforce human review, then create the markdown export and GitHub PR.
- **Completion rule:** the approved draft either produces a successful PR result or returns an actionable blocking error without side effects beyond the point of failure.
- **Primary CTA:** **Create GitHub PR**
- **Allowed secondary actions:** back to Draft, export dry run, copy markdown preview, save and exit.
- **Guard before primary CTA can execute:** explicit human approval must already be set in the step.

## Interruption and resume behavior

### Resume principles

1. The system resumes the user into the **last incomplete step** for the current sprint.
2. All user-authored input and ordering changes persist across interruption.
3. Generated output persists until explicitly regenerated or invalidated by upstream changes.
4. Resume must never silently skip the human review gate.

### Persistence expectations by step

| Step | Persist on interruption | Resume behavior |
| --- | --- | --- |
| Capture | Captured notes, uploaded artifacts, timestamps, and sprint association | Return to Capture with existing inputs intact and ready to continue |
| Organize | Story selection, evidence ordering, excluded items, and step completion status | Return to Organize with the same evidence curation state |
| Draft | Latest generated draft, manual edits, confidence markers, and draft version metadata | Return to Draft with the latest editable draft loaded |
| Publish | Approval status, latest export result, adapter error state, and PR metadata if created | Return to Publish unless upstream changes invalidate the draft; if PR already exists, show completion state instead of re-running publish |

### Invalidation rules

1. If Capture changes after Organize is complete, the user may continue, but Organize must be marked **needs review** before Draft can be regenerated from new evidence.
2. If Organize changes after Draft is complete, the existing draft remains viewable but is marked **out of date** and cannot be published until a new draft is generated.
3. If Draft content changes after approval is set, approval is cleared and must be re-applied before publish can run.

### Failure and retry rules

1. If markdown export fails, the user stays in Publish with an actionable error and no PR side effect.
2. If branch, commit, or PR creation fails after approval, the user stays in Publish with the exact failed stage surfaced for retry.
3. If a PR was already created successfully, resume shows the created PR details and disables duplicate create behavior by default.

## Sign-off statement

Day 2 UX and state model is complete. The MVP wizard now has a fixed state machine, one primary CTA per step, and locked interruption/resume behavior for implementation.
