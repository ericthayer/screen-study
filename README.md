# ScreenStudy

ScreenStudy is an open source tool for capturing your weekly work and turning it into polished UX Engineering case study articles — automatically.

## What It Does

Upload or scan a collection of media — screenshots, videos, and speech-to-text recordings — and an AI agent analyzes, organizes, and drafts a case study article from your content. The goal is a low-maintenance, repeatable workflow for documenting and publishing your design and engineering work.

## Core Features (Planned)

- **Media ingestion** — upload screenshots, screen recordings, and audio/video files
- **AI-powered analysis** — an agent reviews your media and extracts key insights, decisions, and outcomes
- **Auto-organization** — media is categorized and structured around a case study narrative
- **Article generation** — produces a draft UX Engineering case study ready for review and publishing
- **Automated publishing** — push finished articles to a blog or static site with minimal manual effort

## Motivation

Keeping a consistent record of your work is valuable but time-consuming. ScreenStudy removes that friction by letting you capture raw artifacts throughout the week and handling the write-up automatically — so you can stay focused on the work itself.

## Status

Early-stage / work in progress. The tech stack and publishing platform are pending decision — see [ADR-001](docs/adr/0001-frontend-architecture.md) and [ADR-010](docs/adr/0010-publishing-integration-model.md).

## Documentation

ScreenStudy uses a **spec-driven development (SDD)** approach: every feature starts from an approved spec, decisions are recorded as ADRs, and each change is traceable from spec → ADR → tasks → tests → release note.

- [Docs hub & SDD framework](docs/README.md) — spec gate, traceability, delivery plan
- [Specs](docs/specs/) — PRD, per-feature functional specs, non-functional requirements
- [ADRs](docs/adr/) — architecture decision records (ADR-001 … ADR-010)
- [Architecture](docs/architecture/) — system overview, frontend/backend architecture, data model, sequence diagrams
- [Quality](docs/quality/) — accessibility (WCAG 2.2 AA), performance budgets, security threat model
- [Operations](docs/operations/) — CI/CD flow, runbooks, incident response

**Delivery plan:** Plan A — “MVP Monolith First” (Sprints 0–5), with modular boundary discipline so migration to a modular/service architecture stays low-risk. See [docs/README.md](docs/README.md) for the full plan and the Sprint 2 re-evaluation criteria.

## Contributing

Contributions, ideas, and feedback are welcome. Open an issue to start a conversation.

## License

MIT