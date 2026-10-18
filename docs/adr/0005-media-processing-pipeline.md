# ADR-005: Media Processing Pipeline (Whole-File Upload, Content-Validated, Locally Analyzed)

- **Status:** Accepted (MVP scope; chunked upload, malware scanning, and the Postgres-backed worker are deferred)
- **Date:** 2026-08-08
- **Deciders:** Maintainers
- **Related:** [ADR-003](0003-database-strategy.md), [ADR-004](0004-ai-orchestration-pattern.md), DECISIONS.md D3, D10

## Context

Uploaded media is untrusted input: clients can mislabel content types, files can be duplicated across uploads, and recordings can be large. The pipeline must validate what it stores, avoid storing duplicates, and route analysis through the async job pattern (ADR-004) — all without external services.

## Decision

**Uploads are whole-file multipart with a 500MB cap, validated server-side by content (not client claims), deduplicated by content hash, and analyzed through the pluggable `AiProvider` interface with a deterministic offline fallback.**

- **Validation by content:** binary formats are checked against magic-byte signatures (PNG/JPEG/GIF/WebP/MP4/WebM/MP3/WAV/OGG/FLAC, M4A via brand); SVG is checked by content marker. Files whose bytes don't match a supported signature are rejected.
- **Dedupe:** a SHA-256 `content_hash` is computed per upload; an identical re-upload returns the existing media item instead of storing a duplicate, reported in the response's `duplicates` array.
- **Analysis:** all AI access goes through `AiProvider` (`src/server/services/ai.ts`) — `anthropic`, `openai`, or `local` (deterministic offline fallback so the pipeline and tests work without network or API keys). Provider is selected via `AI_PROVIDER`, auto-detected from whichever key is present.
- **Queue technology:** analysis runs on the SQLite-polled `JobRunner` per ADR-004 — not a separate broker.

## Alternatives Considered

- **Trust the client-declared MIME type** — simplest, but lets mislabeled or hostile content into storage. Rejected.
- **Postgres-backed worker queue (PR #2 proposal)** — proper multi-process processing, but requires Postgres (rejected in ADR-003). Deferred as the upgrade path with ADR-004.
- **Chunked/resumable upload sessions** — needed for very large recordings, but adds session state and reassembly complexity. Deferred until >500MB recordings are common.
- **Antivirus/malware scanning** — beyond signature sniffing; deferred to land with the storage backend work.

## Consequences

- Positive: storage contains only validated, deduplicated media; the whole pipeline works offline; tests are hermetic.
- Negative / accepted risks: magic-byte checks are not a malware scanner; 500MB whole-file cap excludes very long recordings; audio/video transcription requires the OpenAI provider (Whisper), and video frame extraction for vision analysis requires ffmpeg (future enhancement).
- Follow-ups / re-evaluation triggers: chunked upload, malware scanning, and ffmpeg-based video frame extraction per the deferred list in DECISIONS.md; worker technology upgrades with ADR-004.
