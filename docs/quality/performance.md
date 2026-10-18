# Performance: Budgets & Load Test Plan

- **Status:** Draft (Sprint 0 baseline)
- **Related:** [ADR-009](../adr/0009-performance-budgets-observability.md), [NFR §1](../specs/non-functional-requirements.md)

## Budgets (release criteria)

| Budget | Target | Enforcement |
|---|---|---|
| Initial JS bundle (gz) | ≤ 200 KB | bundle-size check per PR |
| App shell LCP (p75, Fast 4G) | ≤ 2.5 s | Lighthouse CI on preview deploys |
| Upload API ack (p95) | ≤ 500 ms | API load test (Sprint 1 baseline, Sprint 4 gate) |
| Upload throughput | ≥ 10 Mbps sustained | chunked upload test |
| Analysis start latency (p95) | ≤ 30 s queued→running | job metrics + backlog drain test |
| Image analysis E2E (p95) | ≤ 2 min | worker benchmark with recorded provider fixtures |
| 1-min video transcribe + analysis (p95) | ≤ 5 min | worker benchmark |
| Draft generation, 20 artifacts (p95) | ≤ 3 min | worker benchmark |
| Interactive API responses (p75) | ≤ 300 ms | API load test |

## Reference Dataset (Sprint 4 E2E + load)

- 20 artifacts: 12 screenshots (~2 MB each), 6 short screen recordings (30–90 s, ≤ 200 MB), 2 audio notes (≤ 5 min)
- One 2 GB video for chunking/idempotency verification (AC-ING-03)

## Load Test Plan

| Test | Tool | Scenario | Pass criteria |
|---|---|---|---|
| API baseline | k6 | 50 RPS mixed read endpoints, 10 min | p75 ≤ 300 ms, error rate < 0.1% |
| Upload soak | k6 + multipart | 20 concurrent chunked uploads, mixed sizes | ack p95 ≤ 500 ms; zero corruption (hash verify) |
| Backlog drain | worker bench | enqueue 200 analysis jobs, 4 workers | drain ≤ 15 min with recorded fixtures; no lost jobs |
| Provider outage | fault injection | 50% provider errors for 5 min | retries/backoff engaged; failure rate returns to < 5%; no stuck `running` jobs |
| Publish burst | integration | 10 concurrent publish jobs to test repo | exactly-once commits (idempotency), all receipts recorded |

## Cost Observability

AI token usage and estimated cost are logged per job (AC-ANL-06) and aggregated per user/day; daily cost cap alert per ADR-009. Benchmarks run with recorded fixtures in CI and against live providers on a scheduled (nightly) basis only, to keep CI deterministic and free.

## Tuning Log

Baselines recorded at Sprint 1 (upload) and Sprint 2 (jobs); Sprint 4 tuning pass documents before/after numbers here.
