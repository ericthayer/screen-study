# Feature Spec: AI-Powered Analysis

- **Status:** Proposed
- **Sprint (Plan A):** 2 — AI Analysis Pipeline
- **Related ADRs:** [ADR-004](../adr/0004-ai-orchestration-pattern.md), [ADR-005](../adr/0005-media-processing-pipeline.md), [ADR-003](../adr/0003-database-strategy.md), [ADR-009](../adr/0009-performance-budgets-observability.md)
- **ADR impact check:** None beyond baseline. A new ADR is required if a second AI provider is introduced.

## 1. Summary

After ingestion, an async job pipeline analyzes each artifact: transcription for audio/video, visual understanding for images/recordings, and extraction of key insights, decisions, and outcomes into a normalized schema. Users track job status in the UI.

## 2. User Stories

- US-ANL-01: As a user, my uploads are automatically analyzed without me starting anything.
- US-ANL-02: As a user, I can see per-artifact analysis status (queued → running → done/failed) and retry failures.
- US-ANL-03: As a user, I can read the transcript and extracted insights for any artifact.
- US-ANL-04: As a user, I can edit/correct extracted insights before they feed a draft.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-ANL-01 | Analysis jobs enqueue automatically on `media.ready`; one job per artifact, fan-out per artifact type |
| FR-ANL-02 | Audio/video: speech-to-text transcript with timestamps and detected language |
| FR-ANL-03 | Images/recordings: visual summary, detected UI elements/text (OCR), suggested alt text |
| FR-ANL-04 | Insight extraction into normalized schema: `insight(kind: decision|outcome|problem|technique, text, confidence, source_span)` |
| FR-ANL-05 | Job lifecycle states: `queued → running → succeeded | failed | cancelled`; transitions emit domain events (audit log) |
| FR-ANL-06 | Retries: exponential backoff, max 3, transient/permanent classification; permanent failures surface a reason |
| FR-ANL-07 | All AI calls route through the server-side AI gateway (secrets, rate limits, cost logging per NFR-S3/O2) |
| FR-ANL-08 | Users can edit any extracted insight/transcript; edits are versioned |

## 4. API & Event Contracts (extract)

```
GET  /api/v1/jobs?media_id=…           → job status list
POST /api/v1/jobs/{id}/retry           → requeue (idempotent)
GET  /api/v1/media/{id}/analysis       → transcript + insights
PATCH /api/v1/insights/{id}            → user edit (creates revision)
```

Domain events (in-process now, bus later per ADR-004): `media.ready`, `analysis.started`, `analysis.succeeded`, `analysis.failed`.

## 5. Acceptance Criteria

- **AC-ANL-01:** A 1-minute video with speech yields a timestamped transcript (WER sanity-checked against fixture) and ≥ 1 extracted insight, within NFR-P7.
- **AC-ANL-02:** A screenshot yields a visual summary, OCR text, and a suggested alt text within NFR-P6.
- **AC-ANL-03:** Killing the worker mid-job does not lose or duplicate work (idempotent handler; job resumes/retries).
- **AC-ANL-04:** A forced provider failure surfaces `failed` with a human-readable reason in the UI; retry succeeds after recovery.
- **AC-ANL-05:** Job status UI is keyboard-navigable and uses polite live regions (NFR-A3); no axe critical violations.
- **AC-ANL-06:** Token usage and cost are logged per job and visible in metrics.

## 6. Test Strategy

- Unit: prompt builders, insight schema validation, retry classifier, state machine.
- Worker tests: recorded-fixture AI responses (no live calls in CI).
- Contract: provider request/response schema tests; event contract tests.
- Integration: enqueue → process → persisted analysis; failure → retry path.
- E2E: upload → status transitions visible → analysis view shows transcript/insights.
- Load: backlog drain test per [../quality/performance.md](../quality/performance.md).

## 7. Out of Scope (Sprint 2)

Cross-artifact synthesis and narrative grouping (Sprint 3), custom user prompts, multi-language translation of output.
