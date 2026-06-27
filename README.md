# ScreenStudy

ScreenStudy helps you convert weekly work artifacts into review-ready UX engineering case study drafts, then publish those drafts through a controlled GitHub PR workflow.

## Current MVP

The current implementation is a practical capture-to-publish flow:

1. Quick capture inbox for weekly evidence entries.
2. Weekly queue grouping and review.
3. Portfolio Signal draft generation (`problem`, `decisions`, `outcomes`, `impact`).
4. Low-confidence markers to highlight weak evidence.
5. Mandatory human approval gate before publish.
6. Markdown export with frontmatter.
7. Optional GitHub branch + commit + pull request creation.

## Why This Exists

Documenting work consistently is high-value but time-consuming. ScreenStudy reduces documentation overhead by turning small, frequent captures into a structured publishing artifact.

## Planned Direction

The longer-term direction includes richer media ingestion and AI-assisted narrative extraction. See implementation docs for details.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Use supported Node version:
   - `nvm use 24`
3. Start development server:
   - `npm run dev`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local dev server |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Architecture Snapshot

- Framework: React 19 + TypeScript + Vite 8
- Styling: vanilla CSS
- Main app flow currently lives in `src/App.tsx`
- Persistence via browser localStorage with schema versioning

## Documentation

- Implementation handoff: [docs/implementation-handoff.md](docs/implementation-handoff.md)
- Day-by-day execution docs: [docs](docs)
- Architecture decision records: [docs/decisions](docs/decisions)
- Visual project overview (HTML): [docs/project-overview.html](docs/project-overview.html)

## AI Agent Customization

This repo uses `agents-config` and keeps shared customization in `.agents/`.

Start with:

1. [.agents/AGENTS.md](.agents/AGENTS.md)
2. [.agents/PROJECT-CONTEXT.md](.agents/PROJECT-CONTEXT.md)
3. [.github/copilot-instructions.md](.github/copilot-instructions.md)

## Contributing

Issues and PRs are welcome. Please include reproduction steps and expected behavior for bug reports.

## License

MIT