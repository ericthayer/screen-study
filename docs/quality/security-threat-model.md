# Security Threat Model — Media Upload & AI Workflows

- **Status:** Draft (Sprint 0 baseline; closure gate in Sprint 5)
- **Related:** [ADR-006](../adr/0006-authn-authz-approach.md), [ADR-010](../adr/0010-publishing-integration-model.md), [NFR §4](../specs/non-functional-requirements.md)

## Scope & Assets

Assets: user media (private, unpublished content), transcripts/insights (may contain sensitive work info), drafts, OIDC identity, integration tokens (Git), AI provider credentials.

Trust boundaries: browser ↔ API; API ↔ object storage; worker ↔ AI providers; worker ↔ Git host; CI/CD.

## STRIDE Analysis

### Media upload

| Threat | Vector | Mitigation | Verified by |
|---|---|---|---|
| Spoofing | Stolen session cookie | HttpOnly+Secure+SameSite cookies, CSRF tokens (ADR-006) | auth integration tests |
| Tampering | Chunk manipulation / partial upload corruption | Content-hash verify on complete; idempotent chunk PUTs | AC-ING-03 |
| Repudiation | "I didn't upload that" | Audit/event log with correlation IDs (NFR-O1) | log review |
| Info disclosure | Cross-user media access | Per-user scoping + RLS; signed URLs, short expiry (NFR-S2) | AuthZ tests per endpoint |
| DoS | Oversize/zip-bomb/never-ending chunks | Size caps (FR-ING-02), upload session expiry, per-user rate limits | upload validation tests |
| Malware | Uploading malicious files served to others | Magic-byte validation, malware scan before `ready` (FR-ING-04/05), `Content-Disposition: attachment` + nosniff on signed downloads | pipeline tests |
| Stored XSS | SVG/HTML disguised as images | Reject active content types; serve from separate storage domain with sandbox headers | validation tests |

### AI workflows

| Threat | Vector | Mitigation | Verified by |
|---|---|---|---|
| Prompt injection | Malicious text in media/transcripts steering the model | Treat all extracted content as untrusted data; system-prompt isolation; output schema validation; groundedness rubric blocks unsourced claims (AC-GEN-04) | adversarial fixtures |
| Secret exfiltration | Provider calls leaking keys | Server-side AI gateway only; no keys in client; metadata-only logging (NFR-S3/S4) | config review + log scan |
| Data leakage to provider | User content used for training | Provider terms verified "no training" (NFR-S4); per-user data minimization | vendor review record |
| Cost abuse | Runaway job retries / abuse | Per-user rate limits, max attempts, daily cost cap alert (ADR-009) | fault-injection test |
| Info disclosure | Insights/drafts across users | Same scoping + RLS as media | AuthZ tests |

### Publishing

| Threat | Vector | Mitigation | Verified by |
|---|---|---|---|
| Token theft | Git OAuth token compromise | Encrypted at rest (KMS), minimal scopes, revocable; never returned to client after flow (ADR-006) | token-storage review |
| Over-privilege | Broad repo scopes | Scope-limited tokens; PR mode when branch is protected | scope verification test (AC-PUB suite) |
| Path traversal | Malicious filename in bundle | Filename sanitization + fixed bundle layout | bundle builder tests (AC-PUB-01) |
| Repudiation | Disputed publication | Publications log (target, revision, SHA, timestamp) | integration tests |

## Supply Chain & Platform

- Dependency scanning + secrets scanning + CodeQL in CI (NFR-S5, ADR-007).
- Container images scanned before deploy; ffmpeg and worker images pinned by digest.
- Backups encrypted; restore tested quarterly (runbook).

## Open Risks (to close by Sprint 5)

| # | Risk | Owner | Gate |
|---|---|---|---|
| R1 | OIDC vendor not yet selected | Maintainers | Sprint 1 |
| R2 | Malware scanning engine not yet selected | Maintainers | Sprint 1 |
| R3 | Provider "no training" terms unverified | Maintainers | Sprint 2 |
| R4 | KMS/key management design for integration tokens | Maintainers | Sprint 4 |

Closure = all rows resolved and this document updated; beta checklist item in [operations/runbooks](../operations/runbooks.md).
