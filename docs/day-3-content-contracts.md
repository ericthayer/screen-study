# Day 3 Sign-Off: Content Contracts

Date: 2026-06-27
Status: Approved for MVP implementation

## Purpose

This document locks the MVP content contracts for markdown export, frontmatter, narrative structure, approval state, and versioning behavior.

## Canonical export format

- The only required MVP publish artifact is a **single markdown document**.
- Each exported document must contain:
  1. YAML frontmatter
  2. A markdown body using the locked narrative schema
- The export contract is designed for the single GitHub PR adapter defined in the MVP scope.

## Frontmatter schema

The exported markdown file must include the following frontmatter keys.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | string | yes | Human-readable case study title |
| `slug` | string | yes | URL-safe identifier derived from the story title |
| `summary` | string | yes | Short summary suitable for previews and PR review context |
| `status` | string enum | yes | Must be `approved` at publish time |
| `created_at` | ISO 8601 datetime string | yes | Timestamp of initial sprint creation |
| `updated_at` | ISO 8601 datetime string | yes | Timestamp of latest draft edit affecting export |
| `approved_at` | ISO 8601 datetime string or `null` | yes | Timestamp of latest valid approval |
| `approved_by` | string or `null` | yes | Identifier for the human who last approved the draft |
| `source_sprint_id` | string | yes | Stable identifier for the sprint/work item being published |
| `draft_version` | integer | yes | Monotonic draft version number for the sprint |
| `evidence_count` | integer | yes | Number of evidence items included in the organized story |
| `confidence_flags` | array of strings | yes | Weak-evidence markers that still need human judgment |
| `tags` | array of strings | no | Optional categorization tags |

## Frontmatter example

```yaml
---
title: "Improving the onboarding funnel with a guided setup flow"
slug: "improving-the-onboarding-funnel-with-a-guided-setup-flow"
summary: "How a guided setup flow reduced confusion, clarified next steps, and improved activation."
status: "approved"
created_at: "2026-06-27T08:00:00Z"
updated_at: "2026-06-27T15:30:00Z"
approved_at: "2026-06-27T15:45:00Z"
approved_by: "human-reviewer"
source_sprint_id: "sprint-2026-06-27-onboarding-flow"
draft_version: 3
evidence_count: 6
confidence_flags:
  - "impact-metric-estimated"
tags:
  - "ux-engineering"
  - "onboarding"
---
```

## Narrative schema

The markdown body must follow this section order:

1. `# Title`
2. `## Problem`
3. `## Decisions`
4. `## Outcomes`
5. `## Impact`

Optional supporting sections may exist only if they do not replace the required narrative spine. Optional sections may include:

- `## Context`
- `## Constraints`
- `## Open Questions`
- `## Evidence Notes`

## Narrative contract by section

| Section | Required content |
| --- | --- |
| `Problem` | What was happening, why it mattered, and what user/business tension existed |
| `Decisions` | The key design, engineering, and product choices made to address the problem |
| `Outcomes` | What changed after the work shipped, including observed behavior or delivery result |
| `Impact` | Why the outcome matters, including metrics, qualitative signal, tradeoffs, or remaining uncertainty |

## Body rules

1. The title in the markdown body must match the frontmatter `title`.
2. Each required section must contain non-empty content.
3. Weak evidence or uncertainty must be surfaced explicitly in the relevant section rather than omitted.
4. The draft may include bullet lists, short paragraphs, and supporting subheads, but the required top-level section order must remain stable.

## Approval-state contract

Approval is explicit and must be persisted separately from generic draft completion.

| State | Meaning |
| --- | --- |
| `drafting` | Draft exists but has not entered approval |
| `review_ready` | Draft is complete enough for human review |
| `approved` | Human approval has been explicitly granted for the current draft version |
| `approval_invalidated` | Approval previously existed but is no longer valid because the draft changed |
| `publish_failed` | Publish was attempted after approval but failed before successful PR creation |
| `published` | PR creation succeeded and publish metadata is stored |

## Approval rules

1. Only the current `draft_version` may hold an `approved` state.
2. Any content change to the markdown body or export-affecting frontmatter clears approval and moves the draft to `approval_invalidated`.
3. Publish may only execute when the state is `approved`.
4. A failed export or adapter action changes state to `publish_failed` but preserves the current draft content and error details.
5. A successful publish changes state to `published` and stores the resulting PR metadata.

## Versioning rules

1. Each sprint has one stable `source_sprint_id`.
2. `draft_version` starts at `1` when the first generated draft is created.
3. `draft_version` increments whenever the draft content is regenerated or materially edited after generation.
4. Approval always references exactly one `draft_version`.
5. Re-publishing the same sprint after draft changes requires a new `draft_version`, a new approval, and a new export attempt.
6. `updated_at` must reflect the latest change that affected exported content.

## File naming contract

- The exported filename must be `<slug>.md`.
- The GitHub adapter may place the file into the target content path, but the markdown artifact contract itself is filename-stable at the document level.

## Sign-off statement

Day 3 content contracts are now fixed for MVP implementation unless an explicit change decision is recorded.
