# ScreenStudy Agent Guidelines

This file is the primary instruction set for AI coding agents in this repository.

## Objective

Ship a fast, accessible React + TypeScript MVP that helps users move from weekly work capture to review-gated publishing.

## Start Here

1. Read [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md).
2. Read [README.md](../README.md).
3. If the task changes architecture or behavior, check docs in [docs](../docs/).

## Non-Negotiables

- Keep scope tight. Do not change unrelated files.
- Do not revert user-authored styling or behavior unless explicitly requested.
- Do not redesign established UI unless the user asks for design changes.
- Prefer small, incremental edits over large rewrites.
- Use TypeScript strictly. Avoid `any` unless justified.
- Preserve accessibility semantics for forms, buttons, and dynamic status updates.

## Required Checks Before Finishing

Run these commands from repo root:

1. `nvm use 24`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

## Project-Specific Guardrails

- App state and workflow logic currently live in [src/App.tsx](../src/App.tsx).
- Persisted localStorage schema keys are versioned; do not silently break persisted data.
- Mandatory human review gate must remain enforced before real publish actions.
- Keep GitHub publish flow behavior intact unless a task explicitly changes it.

## Conventions

- Framework: React 19 + Vite + TypeScript.
- Styling: vanilla CSS files in `src/`.
- Avoid introducing new UI frameworks unless requested.
- Keep copy concise and action-oriented.

## Where Rules Live

- Accessibility: [rules/accessibility.md](./rules/accessibility.md)
- Component architecture: [rules/component-architecture.md](./rules/component-architecture.md)
- Spec-driven workflow: [rules/spec-driven-development.md](./rules/spec-driven-development.md)
- Performance: [rules/web-performance.md](./rules/web-performance.md)
- Gemini integration constraints: [rules/gemini.md](./rules/gemini.md)

## Where Instructions Live

- Development standards: [instructions/development-standards.instructions.md](./instructions/development-standards.instructions.md)
- UI review checklist: [instructions/web-interface-guidelines.instructions.md](./instructions/web-interface-guidelines.instructions.md)

## Available Local Skills

- Accessibility audit: [skills/accessibility-audit/SKILL.md](./skills/accessibility-audit/SKILL.md)
- Component scaffolding: [skills/scaffold-component/SKILL.md](./skills/scaffold-component/SKILL.md)
- Gemini integration: [skills/integrate-gemini/SKILL.md](./skills/integrate-gemini/SKILL.md)
- SDD workflow template: [skills/workflows/sdd-workflow.md](./skills/workflows/sdd-workflow.md)
- Codebase analysis: [skills/workflows/codebase-analysis.md](./skills/workflows/codebase-analysis.md)

## Documentation Policy

- Link to existing docs instead of duplicating long guidance.
- Record meaningful architecture/process decisions as ADRs under `docs/decisions/`.
- Keep docs updated when changing behavior, contracts, or workflows.

## Common Pitfalls

- Vite 8 requires modern Node. Use Node 24 in this repo to avoid tooling failures.
- Avoid broad refactors of [src/App.tsx](../src/App.tsx) unless asked; it is the current MVP integration point.
- If a task is UI review, use [instructions/web-interface-guidelines.instructions.md](./instructions/web-interface-guidelines.instructions.md) and report actionable findings.