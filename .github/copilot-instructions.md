# Copilot Instructions for ScreenStudy

This repository uses agents-config customizations in `.agents/`.

## Primary References

Read these first for any non-trivial task:

1. [.agents/AGENTS.md](../.agents/AGENTS.md)
2. [.agents/PROJECT-CONTEXT.md](../.agents/PROJECT-CONTEXT.md)
3. [.agents/instructions/development-standards.instructions.md](../.agents/instructions/development-standards.instructions.md)

## Stack

- React 19
- TypeScript
- Vite 8
- Vanilla CSS

## Local Commands

- `nvm use 24`
- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Expectations

- Keep changes scoped and incremental.
- Do not modify unrelated areas.
- Preserve existing UX unless redesign is requested.
- Preserve localStorage compatibility and publish review gate behavior.
- Follow web interface and accessibility guidance from `.agents/instructions/web-interface-guidelines.instructions.md`.

## Known Pitfall

Vite 8 requires a modern Node version. If tooling fails with `CustomEvent is not defined`, switch to Node 24.