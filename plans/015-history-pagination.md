# 015 — History pagination: drop the re-running page entrance

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 1. Purpose & frequency / 7. Cohesion & tokens
- **Estimated scope**: 1 file, ~5 lines

## Problem

`frontend/components/historyView/ui/HistoryView.tsx:192` re-animates the entire session list on **every pagination click** (a tens-of-times/day interaction):

```tsx
/* HistoryView.tsx:192 — current */
<div key={currentPage} className="space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards">
```

- `key={currentPage}` remounts the list, replaying the entrance each page turn.
- `slide-in-from-bottom-8`, `fill-mode-forwards`, `duration-500` are **undefined classes** (only `slide-in-from-bottom-2` exists in index.html; `duration-500` is a transition-duration class, inert for animations). The effective animation is a 0.3s pure fade (`animate-in`/`fade-in`) on a frequently-hit control — over budget for the interaction's frequency tier.

AUDIT §1: frequent interactions get no animation. The strongest fix is deletion.

## Target

```tsx
/* HistoryView.tsx:192 — target */
<div key={currentPage} className="space-y-2 sm:space-y-3">
```

Keep `key={currentPage}` (it resets per-page state/scroll expectations) but remove every animation class. The list swap becomes instant — correct for pagination.

## Repo conventions to follow

- Fade-only entrances exist elsewhere for occasional content (`HistorySessionExercises.tsx` grid keeps its 0.3s fade via plan 007) — pagination is the *frequent* path, which is why it's the exception here.
- Do not compensate with a shorter fade: per AUDIT §1 the decision for this frequency tier is no animation.

## Steps

1. In `HistoryView.tsx:192`, change the className to `space-y-2 sm:space-y-3` (drop `animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards`).

## Boundaries

- Do NOT change `key={currentPage}`, the pagination controls, or the session block rendering.
- Do NOT touch `HistorySessionExercises.tsx` or other files.
- Do NOT add a replacement animation.

## Verification

- **Mechanical**: `npm run build` passes; `rg -n "slide-in-from-bottom-8|fill-mode-forwards" frontend` returns zero hits.
- **Feel check**: page through history — lists swap instantly on click; no fade flash mid-browse; the page-turn feels immediate and predictable.
- **Done when**: clicking pagination swaps the list with zero animation.
