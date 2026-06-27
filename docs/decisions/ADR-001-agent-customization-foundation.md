# ADR-001: Adopt agents-config customization foundation for ScreenStudy

## Status
Accepted

## Date
2026-06-27

## Context

The repository had AI customization files with drift:

- Instructions referenced files that did not exist.
- Some rules were tailored to unrelated stacks (for example Three.js or MUI-heavy assumptions).
- Guidance duplicated long content instead of linking to source docs.
- New contributors and coding agents lacked a single reliable entry point.

At the same time, the project now uses `agents-config` and needs customizations aligned with the current stack:

- React 19 + TypeScript + Vite 8
- Vanilla CSS
- MVP workflow centered on capture -> draft -> review gate -> publish

## Decision

Adopt a linked, minimal, repo-specific customization structure:

1. Make `.agents/AGENTS.md` the primary entry point.
2. Add `.agents/PROJECT-CONTEXT.md` as the concrete operational context.
3. Keep `.github/copilot-instructions.md` concise and link-first.
4. Update selected `.agents` rules/instructions/skills to remove stack drift and align with current behavior.
5. Record this as an ADR so future updates have traceable intent.

## Alternatives Considered

### Keep existing files as-is
- Pros: no effort now
- Cons: continued instruction drift, lower agent reliability
- Rejected: too much ambiguity for ongoing work

### Expand all guidance into one large instruction file
- Pros: one file to read
- Cons: duplicated content, hard to maintain, high context cost
- Rejected: violates minimal, link-first documentation principles

### Remove project-level customization and rely on defaults
- Pros: less maintenance
- Cons: loses project-specific constraints and known pitfalls
- Rejected: this codebase benefits from explicit workflow constraints

## Consequences

### Positive
- Faster onboarding for humans and coding agents
- Better consistency between instructions and real stack
- Less duplicated documentation and fewer stale references
- Explicit record of why customization structure exists

### Trade-offs
- Requires occasional maintenance as architecture evolves
- Team must update docs when core workflows change

## Follow-up

- Keep this ADR updated if the customization model changes significantly.
- Add future ADRs when changing major workflow or architecture decisions.
