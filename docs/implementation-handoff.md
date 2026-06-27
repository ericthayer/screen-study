# ScreenStudy Implementation Handoff

This document is the execution handoff for implementing the MVP plan.

## Scope Lock

- In scope: 4-step Publish Sprint Wizard, Portfolio Signal Mode, markdown export, GitHub PR adapter, mandatory human review before publish.
- Out of scope: team collaboration workflows, multi-adapter publishing in MVP, autonomous publish without review.

## Definition of Done

- A user can complete capture -> organize -> draft -> approve -> GitHub PR publish flow.
- Human approval is required before any publish action.
- Pilot median completion time is <= 30 minutes, or an explicit remediation backlog exists.

## 2-Week Build Checklist (10 Business Days)

1. Day 1: Contract freeze
- [x] Lock persona, job-to-be-done, and success metrics.
- [x] Freeze scope and non-goals.
- [x] Document acceptance criteria for each wizard step.

2. Day 2: UX and state model
- [x] Finalize state machine for Capture, Organize, Draft, Publish.
- [x] Enforce one primary CTA per step.
- [x] Define interruption and resume behavior.

3. Day 3: Content contracts
- [x] Lock markdown and frontmatter schema.
- [x] Lock narrative schema: problem, decisions, outcomes, impact.
- [x] Lock approval-state and versioning rules.

4. Days 4-5: Quick Capture Inbox
- [x] Implement phone-friendly quick add.
- [x] Implement weekly queue grouping.
- [x] Implement interruption-safe persistence.

5. Days 6-7: Portfolio Signal + review gate
- [x] Generate draft sections using portfolio signal structure.
- [x] Add low-confidence markers.
- [x] Enforce mandatory review gate prior to publish.

6. Day 8: Publishing outputs
- [x] Export markdown with valid frontmatter.
- [x] Create branch + commit + PR in GitHub content repo.
- [x] Add dry-run mode and actionable error messages.

7. Day 9: End-to-end hardening
- [x] Test full flow from capture to PR.
- [x] Fix P0/P1 defects.
- [x] Validate resume flow and no data loss.

8. Day 10: Pilot and launch memo
- [ ] Run 3-5 target-user pilot sessions.
- [ ] Record completion time and top friction points.
- [ ] Publish launch memo and next backlog slice.

## 6-Week MVP Checklist

1. Week 1: Foundation
- [ ] Finalize architecture boundaries and adapter interface.
- [ ] Finalize UX state machine.
- [ ] Finalize content and approval contracts.

2. Week 2: Capture
- [ ] Ship quick capture inbox and weekly queue.
- [ ] Add persistence and basic telemetry.

3. Week 3: Draft intelligence
- [ ] Ship Portfolio Signal Mode generation.
- [ ] Add weak-evidence checks and draft edit loop.

4. Week 4: Publish controls
- [ ] Ship mandatory approval checkpoint.
- [ ] Ship markdown export + GitHub PR adapter.

5. Week 5: Reliability and UX optimization
- [ ] Optimize highest drop-off step using telemetry.
- [ ] Resolve top reliability defects.

6. Week 6: Validation and release decision
- [ ] Run 5-8 user sessions.
- [ ] Confirm repeat-usage signal.
- [ ] Produce go/no-go decision with metrics.

## Immediate CLI Startup Commands

Use these from the project root.

### 1) Start a new remote-controllable CLI session

```bash
gh copilot -- --remote --name "screenstudy-mvp-implementation" -C "." -i "Read docs/implementation-handoff.md, then execute Day 1 contract-freeze tasks and produce a concise sign-off summary."
```

### 2) Resume most recent CLI session

```bash
gh copilot -- --continue
```

### 3) Resume a specific session by ID

```bash
gh copilot -- --resume=<session-id>
```

## Recommended First Prompt for the New CLI Session

Read docs/implementation-handoff.md and execute Day 1 now:

1. Produce final scope freeze statement.
2. Produce non-goals freeze statement.
3. Produce step-level acceptance criteria for Capture, Organize, Draft, Publish.
4. Create a short sign-off artifact in docs/day-1-signoff.md.

## Day 1 Outcome

Day 1 contract freeze has been completed and recorded in `docs/day-1-signoff.md`.

## Day 2 Outcome

Day 2 UX and state model decisions have been completed and recorded in `docs/day-2-ux-state-model.md`.

## Day 3 Outcome

Day 3 content contracts have been completed and recorded in `docs/day-3-content-contracts.md`.

## Days 4-5 Outcome

Days 4-5 Quick Capture Inbox implementation has been completed and recorded in `docs/day-4-5-quick-capture-inbox.md`.

## Days 6-7 Outcome

Days 6-7 Portfolio Signal + review gate implementation has been completed and recorded in `docs/day-6-7-portfolio-signal-review-gate.md`.

## Day 8 Outcome

Day 8 publishing outputs implementation has been completed and recorded in `docs/day-8-publishing-outputs.md`.

## Day 9 Outcome

Day 9 end-to-end hardening has been completed and recorded in `docs/day-9-end-to-end-hardening.md`.
