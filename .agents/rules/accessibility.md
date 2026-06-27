---
description: Accessibility guardrails for ScreenStudy UI and workflows.
---

# Accessibility Rules

Apply these rules to all UI changes.

## Semantics

- Use native HTML semantics first (`button`, `a`, `label`, `input`, `textarea`, `select`, `form`).
- Use buttons for actions and links for navigation.
- Preserve heading hierarchy and readable section structure.

## Forms

- Every control must have a visible label or an accessible name.
- Use meaningful `name`, `type`, and `autocomplete` values.
- Do not block paste.
- Keep validation messages near fields.
- Focus first invalid field on submit errors when validation is added.

## Focus + Keyboard

- Interactive elements must be keyboard reachable.
- Never remove visible focus states without a replacement.
- Prefer `:focus-visible` styles over `:focus` styles.

## Dynamic Updates

- Use `aria-live="polite"` for asynchronous status updates.
- Keep loading and error states understandable without visuals alone.

## Motion + Interaction

- Respect `prefers-reduced-motion`.
- Avoid motion that obscures content or blocks interaction.

## Copy + Contrast

- Keep labels and button text specific and action-oriented.
- Ensure adequate color contrast in default, hover, and focus states.
- Do not rely on color alone for status communication.

## Ready-to-Ship Accessibility Checks

1. Keyboard-only pass across all interactive controls.
2. Form labels and error messaging pass.
3. Focus-visible pass.
4. Screen-reader friendly status updates pass.