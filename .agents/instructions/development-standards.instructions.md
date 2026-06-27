---
applyTo: '**/*.{ts,tsx,css,html,md}'
---

# Development Standards

Use these standards for day-to-day coding in this repository.

## Source of Truth

- Project-level guidance: [../AGENTS.md](../AGENTS.md)
- Repo specifics: [../PROJECT-CONTEXT.md](../PROJECT-CONTEXT.md)
- UI quality rules: [./web-interface-guidelines.instructions.md](./web-interface-guidelines.instructions.md)

## Implementation Style

- Keep edits incremental and scoped to the requested change.
- Prefer clear, explicit state transitions over clever abstractions.
- Preserve existing behavior unless the task requests behavior changes.
- Avoid introducing new frameworks or dependencies without a clear reason.

## TypeScript + React

- Use strict typing and descriptive interfaces for non-trivial shapes.
- Avoid `any`; use `unknown` with narrowing when needed.
- Prefer functional components and hooks.
- Keep heavy logic in helper functions where it improves readability.

## CSS

- Reuse existing style patterns before adding new ones.
- Avoid global style side effects unless intentional.
- Ensure controls remain accessible in hover, focus-visible, disabled, and error states.

## Reliability

- Preserve localStorage schema compatibility.
- Preserve review-gate requirement before publish actions.
- Ensure error messages include actionable next steps when possible.

## Validation

Before finalizing changes run:

1. `nvm use 24`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`