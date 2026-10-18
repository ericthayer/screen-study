# Feature Spec: Media Ingestion

- **Status:** Proposed
- **Sprint (Plan A):** 1 — Media Ingestion Vertical Slice
- **Related ADRs:** [ADR-001](../adr/0001-frontend-architecture.md), [ADR-002](../adr/0002-backend-architecture.md), [ADR-003](../adr/0003-database-strategy.md), [ADR-005](../adr/0005-media-processing-pipeline.md), [ADR-008](../adr/0008-accessibility-compliance-target.md)
- **ADR impact check:** None beyond the ADRs listed (baseline). Amend ADR-003 if chunking requires extra tables.

## 1. Summary

Users upload screenshots, screen recordings, and audio/video notes through a web UI. The backend validates, stores the binary in object storage, persists metadata in Postgres, and records a job status entry so downstream analysis can pick it up.

## 2. User Stories

- US-ING-01: As a user, I can drag-and-drop or browse-select multiple files so I can capture a week's artifacts in one action.
- US-ING-02: As a user, I see per-file progress and a clear success/failure state so I know what landed.
- US-ING-03: As a user, I get immediate, plain-language validation errors (file too large / unsupported type) so I can fix them.
- US-ING-04: As a keyboard/screen-reader user, I can complete an upload without a mouse and hear status updates.
- US-ING-05: As a user, I can add or accept suggested alt text for images (placeholder workflow in Sprint 1) so published content is accessible.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-ING-01 | Accept: PNG/JPEG/WebP/GIF images; MP4/WebM/MOV video; MP3/WAV/M4A audio |
| FR-ING-02 | Per-file size cap: 2 GB (video), 100 MB (image/audio) — enforced client- and server-side |
| FR-ING-03 | Files > 25 MB upload via chunked/resumable protocol; chunk size 8 MB |
| FR-ING-04 | Server validates magic bytes; extension/MIME alone is insufficient |
| FR-ING-05 | Server scans uploads for malware before marking them ready |
| FR-ING-06 | Persist media metadata row (owner, kind, size, hash, storage pointer) + job status row (`uploaded`) |
| FR-ING-07 | Content-hash dedupe: re-uploading an identical file links to the existing object |
| FR-ING-08 | Media is served only through short-lived signed URLs, scoped to the owner |

## 4. API Contract (OpenAPI-extract)

```
POST   /api/v1/uploads                 → create upload session (multipart init / chunked)
PUT    /api/v1/uploads/{id}/chunks/{n} → upload chunk n (idempotent)
POST   /api/v1/uploads/{id}/complete   → finalize; returns media_id
GET    /api/v1/media                   → list current user's media (paginated)
GET    /api/v1/media/{id}              → metadata + signed URL
DELETE /api/v1/media/{id}              → soft delete
```

Errors use RFC 9457 problem details. The authoritative contract lives in the repo as an OpenAPI document once Sprint 1 begins; contract tests verify the implementation against it.

## 5. Data Contract

`media` and `jobs` tables as defined in [../architecture/data-model.md](../architecture/data-model.md). Storage layout per [ADR-003](../adr/0003-database-strategy.md).

## 6. Acceptance Criteria

- **AC-ING-01:** Upload of a mixed 10-file batch (image/video/audio) completes and all rows/objects are consistent (metadata matches stored bytes).
- **AC-ING-02:** Oversized or spoofed-type files are rejected with a specific, actionable error (client + server verified).
- **AC-ING-03:** A 2 GB video uploads via chunking and survives a simulated network retry without corrupting the object (idempotent chunk PUT).
- **AC-ING-04:** Upload UI is fully operable by keyboard; progress and completion are announced to screen readers (axe: no critical violations on the upload route).
- **AC-ING-05:** Duplicate upload of the same bytes does not create a second object (hash match), and the UI reports it as already present.
- **AC-ING-06:** Baseline timings recorded and within NFR-P3/P4.

## 7. Test Strategy

- Unit: validators (magic bytes, size), dedupe, state transitions.
- Contract: OpenAPI conformance for the endpoints above.
- Integration: chunked upload happy path + resume; storage pointer integrity.
- E2E: drag-drop upload of sample set; progress visible; row appears in media list.
- Accessibility: axe automated + keyboard walkthrough script.
- Performance: baseline timing capture per NFR-P3/P4.

## 8. Out of Scope (Sprint 1)

Folder/collection organization, transcription, thumbnails/previews beyond a simple image preview, alt-text AI suggestions (Sprint 2+).
