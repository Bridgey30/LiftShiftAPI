# 010 — Motion tokens + duration/easing standardization

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 7. Cohesion & tokens
- **Estimated scope**: 3-4 files, ~30 lines

## Problem

The codebase has **zero motion tokens** (verified: no `--ease-*`, `--duration-*` custom properties anywhere in `frontend/`). Durations and easings are hand-typed ad hoc, and several hover transitions run at 700ms — 2.3× the 300ms UI budget (AUDIT §2):

```tsx
/* 700ms hovers/transitions on daily-seen cards */
/* frontend/components/dashboard/injuryRisk/InjuryRiskCard.tsx:143 */
className="transition-all duration-700 ease-out"
/* frontend/components/dashboard/hypertrophy/HypertrophyBarCard.tsx:182 */
className="transition-all duration-700 ease-out"
/* frontend/components/muscleAnalysis/ui/LifetimeAchievementCard.tsx:524 */
className="transition-all duration-700 ease-out"
/* frontend/components/historyView/ui/HistorySessionHeaderCard.tsx:96 */
className="transition-all duration-700 ease-out"

/* near-duplicate hand-typed beziers that almost match */
/* frontend/components/app/AppLoadingOverlay.tsx:176 */
transition-opacity duration-100 ease-[cubic-bezier(0.4,0,0.2,1)]
/* frontend/components/dashboard/trainingTimeline/TrainingTimelineCard.tsx:173 */
animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite
```

## Target

1. Add easing tokens to `frontend/tailwind.css`'s `@theme` (Tailwind v4 idiom — `@theme` values become utilities; overriding the built-in `ease-out`/`ease-in-out` names is intentional):

```css
/* frontend/tailwind.css — @theme additions (AUDIT.md §2 curves) */
@theme {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);       /* strong ease-out for UI */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* strong ease-in-out for on-screen movement */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* iOS-like drawer curve */
}
```

   These generate `ease-out`, `ease-in-out`, `ease-drawer` utilities (the first two override Tailwind's built-ins — every existing `ease-out` in the codebase silently upgrades to the strong curve, which is the desired behavior; verify no visual regression in feel check).

2. Replace the four 700ms hovers with 200ms (`duration-200` + default strong `ease-out`):

```tsx
/* all four sites → */
className="transition-colors duration-200 ease-out"
```

   (These four only change stroke/color on hover — `transition-colors` per plan 003; the executor should confirm each site's hover variants are color-only before choosing `transition-colors` vs `transition-[...]`.)

3. Deduplicate the near-identical beziers: `AppLoadingOverlay.tsx:176` → `ease-out` (now the strong token); `TrainingTimelineCard.tsx:173` → keep its 4s pulse but swap the curve to `ease-in-out` (the tokenized strong curve) so no two hand-typed beziers remain.

## Repo conventions to follow

- Tailwind v4 config lives in `frontend/tailwind.css` (`@theme` already declares `--breakpoint-xs`/`--breakpoint-lg`). Add the easing tokens there.
- Audit value source: AUDIT.md §2 (`--ease-out`, `--ease-in-out`, `--ease-drawer` — copy exactly, never approximate).
- Plan 003 owns the `transition-all` → scoped-property sweep; run this plan's edits with that mapping in mind (the four 700ms sites become `transition-colors` here, so plan 003's executor should skip them or vice versa — coordinate: this plan takes ownership of those four lines).

## Steps

1. Add the three `--ease-*` tokens to `@theme` in `frontend/tailwind.css`.
2. Fix the four 700ms sites (InjuryRiskCard:143, HypertrophyBarCard:182, LifetimeAchievementCard:524, HistorySessionHeaderCard:96): `transition-all duration-700 ease-out` → `transition-colors duration-200 ease-out`.
3. `AppLoadingOverlay.tsx:176`: `ease-[cubic-bezier(0.4,0,0.2,1)]` → `ease-out`.
4. `TrainingTimelineCard.tsx:173`: `cubic-bezier(0.4, 0, 0.6, 1)` → `ease-in-out`.
5. Update plan 003's README status: the four 700ms lines are owned by this plan.

## Boundaries

- Do NOT change any animation *duration* other than the four 700ms sites listed (entrances/delays are owned by plans 006/008/013/014/015).
- Do NOT touch `uiConstants.ts` keyframes (plan 009 owns shimmer).
- Do NOT add dependencies.
- If overriding the built-in `ease-out` changes the feel of existing entrances (e.g. `transition={{ duration: 0.3, ease: 'easeOut' }}` in motion props is unaffected — Motion uses its own presets), note it in verification rather than reverting.

## Verification

- **Mechanical**: `npm run build` passes; `rg -n "duration-700" frontend --glob "*.tsx"` returns zero hits; `rg -n "cubic-bezier" frontend` returns zero hand-typed hits.
- **Feel check**:
  - Hover an injury-risk gauge card: the color sweep is 200ms and crisp (previously 700ms molasses).
  - Hover any element that uses `ease-out` elsewhere (buttons, nav): feedback feels snappier at the start (strong curve) — confirm nothing looks springy or janky.
  - App loading message opacity change: same feel as before.
- **Done when**: all motion durations/easings in the app resolve to tokens or default utilities; no hand-typed cubic-bezier or >300ms hover transition remains.
