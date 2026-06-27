---
name: scaffold-component
description: Create a React component for ScreenStudy using TypeScript and vanilla CSS patterns already used in this repo.
---

# scaffold-component

Use this skill when the user asks to create a new UI component in this repository.

## Required Process

1. Read [../../AGENTS.md](../../AGENTS.md) and [../../PROJECT-CONTEXT.md](../../PROJECT-CONTEXT.md).
2. If the task is more than a trivial UI tweak, create a spec file using [../workflows/sdd-workflow.md](../workflows/sdd-workflow.md).
3. Implement incrementally and preserve existing app behavior.
4. Validate with typecheck, lint, and build.

## Component Defaults for This Repo

- Use TypeScript `.tsx`.
- Use functional components with explicit props interfaces.
- Use semantic HTML first.
- Style with existing CSS files or a colocated CSS file when requested.
- Keep accessibility labels and focus behavior intact.

## Suggested File Patterns

For reusable components:

```
src/components/ComponentName/ComponentName.tsx
src/components/ComponentName/ComponentName.css
```

For feature-local components:

```
src/features/feature-name/ComponentName.tsx
src/features/feature-name/ComponentName.css
```

If the repository has not yet introduced those folders, create them only when requested or when it clearly improves maintainability.

## Definition of Done

- Component renders and behaves as requested.
- Accessibility basics are covered (labeling, keyboard reachability, focus visibility).
- No lint/type/build regressions.