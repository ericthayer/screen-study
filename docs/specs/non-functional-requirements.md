# Non-Functional Requirements (NFR)

- **Status:** Proposed (Sprint 0 baseline — pending approval)
- **Related ADRs:** [ADR-004](../adr/0004-ai-orchestration-pattern.md), [ADR-008](../adr/0008-accessibility-compliance-target.md), [ADR-009](../adr/0009-performance-budgets-observability.md)
- **Related quality docs:** [accessibility](../quality/accessibility.md), [performance](../quality/performance.md), [security threat model](../quality/security-threat-model.md)

## 1. Performance

| ID | Requirement | Budget/Target |
|---|---|---|
| NFR-P1 | App shell initial load (p75, mid-tier laptop, Fast 4G) | ≤ 2.5 s LCP |
| NFR-P2 | Client JS bundle (initial, gzipped) | ≤ 200 KB |
| NFR-P3 | Upload throughput per file (chunked) | ≥ 10 Mbps sustained on broadband |
| NFR-P4 | Upload API ack latency (p95) | ≤ 500 ms |
| NFR-P5 | Analysis job start latency after upload completes (p95) | ≤ 30 s queued-to-running |
| NFR-P6 | Single-image analysis end-to-end (p95) | ≤ 2 min |
| NFR-P7 | 1-minute video transcribe + analysis (p95) | ≤ 5 min |
| NFR-P8 | Draft generation for a 20-artifact case study (p95) | ≤ 3 min |
| NFR-P9 | Interactive UI responses (route changes, list views, p75) | ≤ 300 ms server time |

Load test plan and tooling: [../quality/performance.md](../quality/performance.md).

## 2. Accessibility

| ID | Requirement |
|---|---|
| NFR-A1 | WCAG **2.2 AA** conformance for all user-facing flows (baseline per ADR-008) |
| NFR-A2 | Full keyboard operability of the core loop (upload → review → publish) |
| NFR-A3 | File-input and upload progress are screen-reader announced; async job status uses polite live regions |
| NFR-A4 | Alt-text workflow: user-editable alt text for every published image (AI-suggested, human-approved) |
| NFR-A5 | Automated a11y checks (axe) run in CI on key routes; manual audit in Sprint 4 |

Checklist + test matrix: [../quality/accessibility.md](../quality/accessibility.md).

## 3. Reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-R1 | End-to-end pipeline success rate (upload → draft) | ≥ 95% weekly |
| NFR-R2 | Job retry policy | Exponential backoff, max 3 retries; transient vs permanent failure classification |
| NFR-R3 | Idempotency | All job handlers and upload completion are idempotent (idempotency keys on jobs; content-hash dedupe on uploads) |
| NFR-R4 | Data durability | Uploaded media durably stored before API success is returned; DB backups daily, 30-day retention |
| NFR-R5 | Recoverability | Any failed job can be requeued from the UI without re-uploading media |

## 4. Security & Privacy

| ID | Requirement |
|---|---|
| NFR-S1 | AuthN on all non-public routes; per-user authorization scoping on every media/article query (ADR-006) |
| NFR-S2 | Media uploads validated by magic bytes (not just extension/MIME), size-capped, and stored outside the web root with expiring URLs |
| NFR-S3 | All third-party AI calls go through a server-side gateway with secret management and per-user rate limits |
| NFR-S4 | User content is never used to train models (provider terms verified); PII minimization in logs/traces |
| NFR-S5 | Dependency and container scanning in CI; secrets scanning pre-commit and in CI |
| NFR-S6 | Threat model for media upload and AI workflows maintained and closed out in Sprint 5 |

Threat model: [../quality/security-threat-model.md](../quality/security-threat-model.md).

## 5. Observability

| ID | Requirement |
|---|---|
| NFR-O1 | Structured JSON logs with correlation IDs across API → queue → worker (ADR-009) |
| NFR-O2 | Metrics for upload volume, job latency/failure rate, AI token usage/cost, publish success rate |
| NFR-O3 | Dashboards + alert thresholds live before beta (Sprint 5) |

## 6. Scalability Re-Evaluation Thresholds (Plan A → Plan B gate)

Re-evaluate architecture at end of Sprint 2 if any two are exceeded:

| Indicator | Threshold |
|---|---|
| Ingestion volume trend | > 500 uploads/week or > 100 GB stored |
| AI job latency | p95 queue wait > 5 min sustained |
| AI job failure rate | > 5% weekly |
| Contributor concurrency | > 3 engineers merging conflicting changes in the same modules weekly |
| Publishing integration complexity | > 2 publishing targets requested |
