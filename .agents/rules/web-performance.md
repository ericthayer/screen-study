---
description: Performance rules for ScreenStudy (React + TypeScript + Vite).
---

# Web Performance Rules

Use these rules for any feature or refactor.

## Baseline Targets

- Keep interactions responsive for form-heavy flows.
- Keep render and update paths cheap for frequent input edits.
- Prevent layout shifts and overflow regressions.

## Rendering

- Avoid unnecessary re-renders in large mapped lists.
- Use memoization only where it measurably helps.
- Keep expensive logic out of render paths.

## Inputs + State

- Prefer cheap per-keystroke state updates.
- Avoid expensive synchronous work in `onChange` handlers.
- Batch related state updates where practical.

## Lists

- For lists above ~50 items, consider virtualization (`virtua`) or `content-visibility` strategy.
- Keep list item DOM simple and predictable.

## Layout + CSS

- Avoid `transition: all`.
- Ensure controls use `box-sizing: border-box` when width constraints matter.
- Prevent horizontal overflow from full-width controls and containers.

## Asset + Network

- Keep bundle footprint lean; do not add heavy dependencies without need.
- Use lazy loading for non-critical assets/content where appropriate.

## Verification

- Verify on mobile-width viewport and desktop.
- Run `npm run build` to catch bundling/type integration issues.
- Confirm no visible regressions in capture -> draft -> publish workflow.