# Operations Runbooks

- **Status:** Draft (basics now; expanded through Sprint 5)
- **Related:** [incident-response](incident-response.md), [ADR-009](../adr/0009-performance-budgets-observability.md), [NFR §3/§5](../specs/non-functional-requirements.md)

## RB-01: Rollback a Bad Deploy

1. Identify the last good tag: `git tag --sort=-creatordate | head -5`.
2. Trigger the production deploy workflow with the previous tag (manual dispatch).
3. Verify health checks + spot-check core loop (upload a fixture image).
4. If a migration was included: forward-fix preferred; apply compensating migration only if the schema breaks the old version.
5. Open an incident record per [incident-response](incident-response.md) if users were impacted.

## RB-02: Job Queue Backlog

Symptoms: queue depth growing > 30 min (alert), analysis start latency over budget.

1. Check worker health and concurrency settings (deploy metrics dashboard).
2. Check provider status page; if provider degraded, expect backoff storms — consider pausing non-critical job types.
3. Scale workers horizontally (add replicas); Postgres queue requires no reconfiguration.
4. If a poison job loops: mark it `cancelled`; investigate `last_error`; add a permanent-failure classification if missing.
5. Post-incident: verify no stuck `running` jobs (`UPDATE jobs SET status='queued' WHERE status='running' AND started_at < now() - interval '1 hour'` — only after confirming the worker is dead).

## RB-03: AI Provider Outage / Cost Spike

1. Cost spike: check per-user/per-job token metrics (ADR-009); apply per-user rate limit or pause `draft.generate`/`extract_insights` types if the daily cap is hit.
2. Outage: jobs retry automatically (max 3, backoff). For extended outages, pause affected job types and banner the UI.
3. Resume by requeuing `failed` jobs from the jobs admin view (idempotent — NFR-R5).

## RB-04: Storage/Backup Restore

1. Postgres: nightly backups, 30-day retention (NFR-R4). Restore to a point-in-time instance, then repoint the app via config.
2. Object storage: versioning enabled on the bucket; restore deleted objects from versions.
3. Consistency: media rows reference storage keys — after any partial restore, run the integrity job (verify every `ready` media row resolves to an object and hash matches).
4. Quarterly: perform a full restore drill and record results here.

## RB-05: Rotate Secrets

1. AI provider keys, OIDC client secret, KMS data keys, session signing secret — rotate via the platform secret store.
2. Rolling restart of API + worker after rotation; verify jobs and auth flows.
3. Suspected compromise: rotate immediately, revoke affected integration tokens, review audit/event log for unusual `correlation_id` activity.

## Beta Launch Checklist (Sprint 5)

- [ ] Dashboards + alerts live (NFR-O3): job failure rate, queue depth, API latency, AI cost
- [ ] Rollback drill performed (RB-01)
- [ ] Restore drill performed (RB-04)
- [ ] Threat model open risks closed ([security-threat-model](../quality/security-threat-model.md))
- [ ] Accessibility audit closed (AC-PRD-04)
- [ ] Onboarding guide published
