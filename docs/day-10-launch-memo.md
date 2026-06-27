# Day 10 Launch Memo

Date: 2026-06-27
Status: Drafted with synthetic sample data (non-production evidence)

> **Important:** The numbers below are synthetic placeholders generated for workflow rehearsal, not real target-user pilot evidence.

## Pilot objective

Validate that a target user can complete **capture -> organize -> draft -> approve -> publish-to-PR** with median completion time of **30 minutes or less**, or produce an explicit remediation backlog.

## Pilot execution plan

- Target participants: 3-5 users aligned to the locked MVP persona.
- Session type: moderated walkthrough on the current scaffold.
- Success threshold: median completion time <= 30 minutes.
- Data capture file: `docs/day-10-pilot-session-log.csv`.

## Pilot protocol

1. Start timer at first user action in Capture.
2. Observe user progressing through Capture -> Organize -> Draft -> Publish.
3. Stop timer when publish dry run or PR creation completes successfully.
4. Record completion time, whether end-to-end was completed, and top friction points.
5. Repeat for at least 3 users before making release decision.

## Session results (synthetic placeholder sample)

| Session | Persona fit | Completion time (min) | Completed flow end-to-end | Top friction points | Notes |
| --- | --- | ---: | --- | --- | --- |
| 1 | high | 24 | yes | low confidence flags unclear | completed with minor guidance |
| 2 | high | 31 | yes | github token setup confusion | completed after clarifying publish config |
| 3 | medium | 28 | yes | evidence grouping mental model | completed end-to-end |
| 4 | high | 35 | yes | base branch naming mismatch | completed after retry with corrected config |
| 5 | medium | 33 | no | missing token scope | stopped at publish config stage |

## Metrics summary

- Sessions run: 5
- Median completion time: 31 min
- End-to-end completion rate: 80% (4/5)
- Highest drop-off step: Publish

## Top friction clusters

1. Publish configuration setup (owner/repo/base branch/token expectations)
2. Approval + publish CTA discoverability and state transitions
3. Meaning of low-confidence markers in generated draft

## Remediation backlog (if median > 30 min or major blockers observed)

| Priority | Issue | Evidence | Proposed fix | Owner |
| --- | --- | --- | --- | --- |
| P0 | Publish config failures block completion | Sessions 2, 4, 5 showed config/token errors in Publish | Add preflight config validator with explicit required fields and token scope check hints | Engineering |
| P1 | Publish CTA state unclear after draft edits | Session 5 confusion around approval reset/disabled publish action | Add inline explanation when approval is invalidated and why publish is disabled | UX + Engineering |
| P2 | Low-confidence markers not actionable enough | Session 1 confusion about how to resolve flags | Add contextual guidance for each low-confidence marker type | Product + Engineering |

## Release decision

- Decision: **conditional-go**
- Rationale: Synthetic sample median is 31 minutes (>30 target) with concentrated friction in Publish setup.
- Conditions before production rollout (if any):
  1. Ship publish preflight validation and clearer error guidance.
  2. Improve approval-reset messaging.
  3. Re-run with real target users and confirm median <= 30 minutes.

## Next backlog slice

1. Publish preflight validation panel (owner/repo/branch/token scope checks)
2. Approval-state UX refinement with explicit invalidation messaging
3. Marker resolution hints for low-confidence flags

## Sign-off

Memo and data-capture process are ready. A final production sign-off still requires replacing synthetic data with real participant pilot results.

## Immediate operator checklist

1. Run 3-5 pilot sessions and fill `docs/day-10-pilot-session-log.csv`.
2. Copy summarized outcomes into this memo's tables.
3. Set final release decision and next backlog slice.
