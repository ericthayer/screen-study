# Accessibility: Checklist & Test Matrix

- **Status:** Draft (Sprint 0 baseline)
- **Target:** WCAG **2.2 AA** ([ADR-008](../adr/0008-accessibility-compliance-target.md))
- **Related:** [NFR §2](../specs/non-functional-requirements.md), [frontend architecture](../architecture/frontend-architecture.md)

## Checklist (per feature, applied at spec-gate and PR time)

### Perceivable
- [ ] All images/media have alt text (user-editable; AI-suggested; required at publish — NFR-A4)
- [ ] Video/audio have transcripts (auto-generated, user-correctable)
- [ ] Color contrast ≥ 4.5:1 text / 3:1 large text & UI components
- [ ] Information never conveyed by color alone (job status has icon + text)
- [ ] Content readable at 200% zoom and 320px width (reflow)

### Operable
- [ ] Full keyboard operability, visible focus indicator (WCAG 2.2 focus appearance)
- [ ] Drag-and-drop has a keyboard alternative (move-to menu / reorder buttons — NFR-A2)
- [ ] No keyboard traps (dialogs, editors)
- [ ] Touch/pointer targets ≥ 24×24 CSS px (WCAG 2.2 target size)
- [ ] Upload retry/cancel available from keyboard; no drag-only interactions

### Understandable
- [ ] Form errors identified in text, associated with fields, announced
- [ ] Consistent navigation and component behavior across routes
- [ ] Auth flow does not rely on cognitive puzzles (WCAG 2.2 accessible authentication)

### Robust
- [ ] Valid semantics/landmarks (`header/nav/main`, headings hierarchy per route)
- [ ] Async status (upload progress, job states) uses `aria-live="polite"`; errors use `role="alert"` (NFR-A3)
- [ ] axe-core: zero critical/serious violations on key routes

## Test Matrix

| Route / Flow | axe (CI) | Keyboard script | Screen reader (manual) | Sprint |
|---|---|---|---|---|
| Login / auth callback | ✅ | ✅ | NVDA + VoiceOver smoke | 1 |
| Upload (dropzone, progress, errors) | ✅ | ✅ | progress announcements verified | 1 |
| Media library + alt-text editing | ✅ | ✅ | table/list navigation | 2 |
| Jobs timeline + retry | ✅ | ✅ | live-region behavior | 2 |
| Organize (sections, drag-drop + keyboard reorder) | ✅ | ✅ | move announcements | 3 |
| Draft editor (headings nav, revisions, regen) | ✅ | ✅ | editor landmarks | 3 |
| Publish (dry-run diff, dialogs, confirm) | ✅ | ✅ | dialog focus management | 4 |
| Full audit (external or structured self-audit) | — | — | AC-PRD-04 gate | 4 |

## Process

- **CI:** axe-core runs on key routes per ADR-007; critical/serious violations fail the build (NFR-A5).
- **Manual:** keyboard walkthrough script per spec's acceptance criteria; screen-reader smoke (NVDA + VoiceOver) before each sprint demo.
- **Audit:** Sprint 4 full WCAG 2.2 AA audit; findings tracked as issues linked to AC-PRD-04; closure required before beta.
