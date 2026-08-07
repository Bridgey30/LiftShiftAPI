# 009 — Remove perpetual shimmer and pulsing PR badges from history rows

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 1. Purpose & frequency
- **Estimated scope**: 1 file, ~15 lines

## Problem

`frontend/components/historyView/ui/HistorySetRow.tsx` — the history view is browsed daily; these are **persistent decorative loops on real content rows**, not skeletons:

```tsx
/* HistorySetRow.tsx:89-97 — infinite shimmer on every PR row, for as long as the list is on screen */
animation: 'prRowShimmer 3s ease-in-out infinite',

/* HistorySetRow.tsx:160 and :180 — every PR/Vol-PR badge pulses forever */
className={`... leading-none border animate-pulse ${set.isPr ? 'bg-amber-200/70 ...' : '...'}`}
```

AUDIT §1: decorative motion on frequently-seen elements is a finding — the strongest fix is delete. A user with many PRs gets a wall of 3s-cycle shimmers and 1s-pulsing badges on every visit.

## Target

- Delete the `prRowShimmer` animation from both branches of `prShimmerStyle` (keep the static gradient background — the amber tint still communicates "PR" without movement). Result:

```tsx
/* HistorySetRow.tsx:89-97 — target */
animation: undefined,   /* remove; keep the linear-gradient background + backgroundSize */
```

- Remove `animate-pulse` from both badge classNames (lines 160, 180). Badges render as static, which is the correct resting state for frequently-seen labels.

## Repo conventions to follow

- The `prRowShimmer` keyframes live in `frontend/utils/ui/uiConstants.ts:79` (`ANIMATION_KEYFRAMES`, injected via `DashboardLayout.tsx:173`). Leave the keyframe definition in place (other components may reference it — verify with `rg "prRowShimmer" frontend`; if HistorySetRow is the only consumer, the keyframe may also be removed, but prefer leaving it until the audit's token consolidation plan).
- Plan 010 does not touch this file.

## Steps

1. In `prShimmerStyle` (HistorySetRow.tsx:89-97), delete the `animation: 'prRowShimmer 3s ease-in-out infinite'` line from both the `set.isPr` and non-isPr branches; keep `background` and `backgroundSize`.
2. Remove `animate-pulse` from both badge `<span>` classNames (lines ~160 and ~180).

## Boundaries

- Do NOT change the gradient colors, badge content, or row highlight logic.
- Do NOT touch `prRowShimmer` keyframes in `uiConstants.ts` unless `rg` proves no other consumer.
- Do NOT add replacement animations — the fix here is deletion (AUDIT remedial hierarchy step 1).

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Open History view on a month with several PRs: rows show a static amber tint, badges are static — no movement anywhere in the list; scanning the list is calmer.
  - Confirm the PR tint is still visually distinct (gradient background remains).
- **Done when**: `rg -n "prRowShimmer|animate-pulse" frontend/components/historyView` returns zero hits; the history list contains no running animation.
