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

Early-stage / work in progress. The core pipeline is implemented end to end: upload → analyze → organize → draft → publish. See [DECISIONS.md](./DECISIONS.md) for the chosen stack and architecture.

## Documentation

ScreenStudy uses a spec-driven approach: product and feature requirements live under [`docs/specs/`](docs/specs/), architecture decisions live under [`docs/adr/`](docs/adr/), and supporting system design, quality, and operations docs live in the [`docs/`](docs/) hub.

- [Docs hub](docs/README.md)
- [Feature specs](docs/specs/)
- [Architecture Decision Records](docs/adr/)
- [System architecture](docs/architecture/)
- [Quality docs](docs/quality/)
- [Operations docs](docs/operations/)

## Getting Started

Requires Node.js 20+.

```bash
npm install
npm run dev        # API server on :3000
npm run dev:web    # web client on :5173 (proxies API/media to :3000)
```

Production build:

```bash
npm run build
npm start          # serves API + built web client on :3000
```

### AI providers

The app works out of the box with the offline `local` provider (placeholder insights + template articles). For real AI analysis, set one of:

```bash
export ANTHROPIC_API_KEY=...   # vision analysis + article generation
export OPENAI_API_KEY=...      # vision analysis + Whisper transcription + article generation
export AI_PROVIDER=anthropic   # optional; auto-detected from keys
```

### Development

```bash
npm test           # Vitest (unit + API pipeline tests)
npm run lint
npm run typecheck
```

Data (SQLite DB, uploaded media, published articles) lives in `./data` by default; override with `DATA_DIR`, `MEDIA_DIR`, and `PUBLISH_DIR`.

## Contributing

Contributions, ideas, and feedback are welcome. Open an issue to start a conversation.

## License

MIT