# 003 — Replace `transition-all` with scoped transition classes

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 5. Performance
- **Estimated scope**: ~20 files, one-line class edits

## Problem

`rg -n "transition-all" frontend --glob "*.tsx"` finds **99 occurrences across ~65 files**. `transition-all` animates every animatable property (including box-shadow, border, filter, and, on fixed-position elements, `top`/`left`), all off-GPU. AUDIT §5: "`transition: all` animates unintended properties off-GPU — always a finding."

Worst offenders (ordered by impact):

```tsx
/* frontend/components/ui/Tooltip.tsx:37 — cursor-following fixed tooltip */
className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"

/* frontend/components/historyView/ui/HistoryTooltipPortal.tsx:48 — same */
className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"

/* frontend/components/app/AppHeader.tsx:145 — nav tabs (×5), color/border only */
... border transition-all duration-200 cursor-pointer ...

/* frontend/components/landing/ui/LandingPage.tsx:189 — hero CTA */
... h-11 px-8 border transition-all duration-200 ...

/* frontend/components/landing/ui/PlatformDock.tsx:100 — dock button (already has style springs) */
className={`... rounded-xl ... transition-all duration-100 ...`}

/* frontend/components/app/AppLoadingOverlay.tsx:205 — reload button, color-only hover */
... transition-all duration-200
```

Dashboard cards also carry `transition-all duration-700` (see plan 008/010).

## Target

Replace with the narrowest property list that still captures what the element actually changes on interaction:

- color/border/background-only hovers → `transition-colors`
- opacity-only → `transition-opacity`
- transform-only → `transition-transform`
- transform + opacity → `transition-[opacity,transform]`

Examples:

```tsx
/* Tooltip.tsx:37 target */
className="fixed z-[9999] pointer-events-none transition-[opacity,transform] duration-200 animate-in fade-in zoom-in-95"

/* AppHeader.tsx:145 target */
... border transition-colors duration-200 cursor-pointer ...

/* LandingPage.tsx:189 target */
... h-11 px-8 border transition-colors duration-200 ...
```

## Repo conventions to follow

- Tailwind v4 arbitrary property lists are already used in this repo: `transition-[opacity,transform]` in `frontend/components/dashboard/trainingTimeline/TrainingTimelineCard.tsx:400`. Imitate that syntax.
- The universal `*` transition rule (plan 002) is being removed in the same sweep — after it's gone, explicit per-element transition classes are the only source of transitions, so they must be correct.

## Steps

1. Sweep `frontend` for `transition-all` (`rg -n "transition-all" frontend --glob "*.tsx"`). For each hit, read the element's hover/active variants (the `hover:`/`active:`/`group-hover:` classes on the same className) and apply the property mapping above:
   - `hover:`/`active:` classes are only `text-*`, `bg-*`, `border-*` → `transition-colors`
   - only `opacity-*` → `transition-opacity`
   - only `scale-*`/`translate-*`/`rotate-*` → `transition-transform`
   - mix of transform + opacity → `transition-[opacity,transform]`
   - shadow appears in hover variants → `transition-[box-shadow]` or `transition-shadow`
   - genuinely multiple non-GPU-property-free groups → leave `transition-all` ONLY if the animated properties are exclusively color/border/opacity/shadow and you can prove no layout property is involved.
2. Fix these named high-impact ones first (fixed-position + busy elements): Tooltip.tsx:37, HistoryTooltipPortal.tsx:48, AppHeader.tsx:145, LandingPage.tsx:189, PlatformDock.tsx:100, AppLoadingOverlay.tsx:205, ExerciseViewHeader.tsx (5 hits), HistorySessionHeaderCard.tsx:96, UserPreferencesSectionsSecondary.tsx (4 hits), AiAnalyzeFooter.tsx (3 hits).
3. Leave the seven dashboard cards' `transition-all duration-700` lines for plan 008 (they are deleted there, not just scoped).

## Boundaries

- Do NOT touch `frontend/index.html` (plan 002 owns it).
- Do NOT change durations or easings here — property list only.
- Do NOT edit components under `frontend/components/landing/` beyond the two CTA/dock lines listed (their other motion is handled in plans 004/013).
- If a `transition-all` sits on an element that also has an inline `style={{ transition: ... }}`, leave it for the executor to flag rather than guess.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Hover nav tabs in the app header: color/border feedback is instant enough (150-200ms), nothing else animates.
  - Move the cursor across the exercise-view tooltip trigger: the tooltip follows with no lag, and no box-shadow/border animation flickers.
- **Done when**: `rg -n "transition-all" frontend --glob "*.tsx"` returns only the seven dashboard-card lines reserved for plan 008 (plus any executor-flagged exceptions documented in the plan status).
