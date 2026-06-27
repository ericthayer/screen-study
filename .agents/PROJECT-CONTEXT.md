# ScreenStudy Project Context

## Product Summary

ScreenStudy is an MVP focused on converting weekly evidence capture into a publish-ready case study draft and GitHub pull request.

Primary workflow:

1. Capture entries quickly.
2. Group entries by week.
3. Generate portfolio draft sections.
4. Require explicit human approval.
5. Export markdown and optionally create GitHub branch/commit/PR.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- ESLint
- Vanilla CSS

## Important Paths

- App UI and logic: `src/App.tsx`
- App styles: `src/App.css`, `src/index.css`
- Entry point: `src/main.tsx`
- Implementation artifacts: `docs/*.md`
- Agent customizations: `.agents/`, `.github/copilot-instructions.md`

## Current Architecture Notes

- The MVP is intentionally consolidated in `src/App.tsx`.
- Local state + localStorage provide persistence.
- Weekly grouping and draft generation are deterministic client-side logic.
- Publish adapter uses GitHub REST API from the client for MVP validation.

## Data + Contract Notes

- localStorage keys are schema-versioned:
  - `screenstudy.quick-capture.v2` (current)
  - `screenstudy.quick-capture.v1` (legacy migration path)
- Keep markdown frontmatter structure stable unless contract docs are updated.
- Keep review gate enforced before non-dry-run publishing.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Environment + Tooling Pitfalls

- Vite 8 requires Node >= 20.19 or >= 22.12; this repo uses `nvm use 24`.
- If builds fail with `CustomEvent is not defined`, Node version is too old.

## Coding Expectations

- Keep edits minimal and task-scoped.
- Favor readability and predictable state transitions.
- Preserve accessibility basics for forms and status messages.
- Prefer links to existing docs over duplicated guidance in new docs.