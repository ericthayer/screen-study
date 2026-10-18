# Incident Response (Basics)

- **Status:** Draft (Sprint 0 baseline; Sprint 5 maturity)
- **Related:** [runbooks](runbooks.md), [ADR-009](../adr/0009-performance-budgets-observability.md)

## Severity Levels

| Sev | Definition | Examples | Response |
|---|---|---|---|
| SEV1 | Core loop down or data loss/security exposure | Uploads failing for all users; cross-user data leak; credential compromise | Immediate, all-hands; user comms within 1 h |
| SEV2 | Major degradation, workaround exists | Analysis jobs backing up > 1 h; publishing failing for one target | Same-day response |
| SEV3 | Minor/partial impact | Single failing job type; UI glitch on one route | Next business day |

## Response Flow

1. **Detect** — alerts (ADR-009) or user report. Acknowledge the alert; assign an Incident Commander (IC).
2. **Triage** — IC classifies severity, opens an incident record (issue labeled `incident`), starts a timeline.
3. **Mitigate** — prefer fast mitigation over root cause: rollback (RB-01), pause job types (RB-02/03), feature-flag off.
4. **Communicate** — SEV1/2: status note to affected users; update at least hourly until resolved.
5. **Resolve** — verify recovery against the same signals that fired.
6. **Review** — blameless postmortem within 5 business days for SEV1/2: timeline, root cause, contributing factors, action items with owners and due dates. Link action items to specs/ADRs when they change behavior (traceability).

## Security Incidents

- Contain first: revoke tokens, rotate secrets (RB-05), block access.
- Preserve evidence: export relevant audit/event logs before rotation where feasible.
- Follow the disclosure obligations of our license/hosting terms; user-affecting breaches are always SEV1.

## On-Call (pre-beta)

Maintainers monitor alert channels during agreed hours; beta launch requires named on-call rotation — decided in Sprint 5.
