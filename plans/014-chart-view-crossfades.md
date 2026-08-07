# 014 — Chart view-mode switches: quick crossfade; delete the inert card entrance

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities / 2. Easing & duration
- **Estimated scope**: 4-5 files, ~30 lines

## Problem

Two related issues in the dashboard (daily use):

1. **View-mode toggles teleport.** Switching chart views snaps with no transition:

```tsx
/* frontend/components/dashboard/weeklySets/WeeklySetsCard.tsx:140-152 — target switch; same pattern in TopExercisesCard.tsx:79-94, PrTrendCard, VolumeDensityCard, MuscleTrendCard, WeeklyRhythmCard */
{weeklySetsView === 'radar' ? (
  <WeeklySetsRadarView ... />
) : (
  <WeeklySetsHeatmapView ... />
)}
```

2. **The card mount entrance is inert dead code.** `Dashboard.tsx:69` hard-codes `isMounted = useState(true)`, so every card's `opacity-0 translate-y-4` → `opacity-100 translate-y-0` mount fade (7 cards, `transition-all duration-700 delay-100`, e.g. `VolumeDensityCard.tsx:107`) **never animates** — it's 700ms of `transition-all` doing nothing, contradicting the 300ms UI budget if it were ever wired up.

## Target

1. **View switches**: a fast 150ms opacity crossfade on the chart container when `view` changes. Minimal, dependency-free approach (charts are heavy recharts components; don't animate their internals):

```tsx
/* WeeklySetsCard.tsx:140-152 — target */
<div key={weeklySetsView} className="animate-[fadeIn_0.15s_ease-out]">
  {weeklySetsView === 'radar' ? <WeeklySetsRadarView ... /> : <WeeklySetsHeatmapView ... />}
</div>
```

   `fadeIn` already exists in `frontend/index.html` (used by `.animate-in`). 150ms keeps it well under 300ms and under the "frequent action" threshold — it's a crossfade for comprehension, not decoration. If an `AnimatePresence mode="wait"` crossfade of the two views is preferred, cap both at 120ms.

2. **Inert entrance**: delete the dead mount-fade classes from the seven cards (`VolumeDensityCard.tsx:107`, `WeeklyRhythmCard.tsx:82`, `WeeklySetsCard.tsx:136`, `PrTrendCard.tsx:114`, `TopExercisesCard.tsx:75`, `MuscleTrendCard.tsx:67`, `IntensityEvolutionCard.tsx:108`), plus the `isMounted` state in `Dashboard.tsx:69` and its usages in the cards. Cards render at full opacity — crisp, per the dashboard's personality (AUDIT §7: a dashboard stays crisp; nothing is lost, since the entrance never ran anyway).

## Repo conventions to follow

- `fadeIn` keyframes already exist in `frontend/index.html` (the `.animate-in`/`.fade-in` definitions); `animate-[fadeIn_0.15s_ease-out]` arbitrary animation syntax is already used in `DashboardLayout.tsx:174` (`animate-[fadeIn_0.3s_ease-out]`).
- The seven cards' `isMounted` prop is threaded from `Dashboard.tsx` — remove the prop plumbing in lockstep (props: `isMounted`, `setIsMounted` usages, and the className fragments).
- Do not add motion to tab switches in `AppTabContent.tsx` (high-frequency; AUDIT §1 says no animation there) — this plan covers in-card view toggles only.

## Steps

1. `Dashboard.tsx:69`: delete `const [isMounted, setIsMounted] = useState(true);` and every `isMounted`/`setIsMounted` reference in the file (rg within the file).
2. For each of the seven cards: remove `isMounted` from props, remove the `${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` fragment, and change `transition-all duration-700 delay-100` → `transition-colors` (they mostly re-theme; verify each card's non-hover class changes and pick `transition-colors` or delete the transition class entirely if nothing changes on state change).
3. Wrap each view-switch in the keyed fade div per Target #1 for: WeeklySetsCard (radar/heatmap), TopExercisesCard (barh/area), PrTrendCard, VolumeDensityCard, MuscleTrendCard, WeeklyRhythmCard — match each card's actual toggle values.
4. Do not touch `DashboardLayout.tsx:174`'s existing grid fade (it works — `.animate-[fadeIn_0.3s_ease-out]`; optionally tighten to 0.2s for crispness, executor judgment).

## Boundaries

- Do NOT add `AnimatePresence`/motion to view switches unless the executor prefers it with ≤120ms both ways.
- Do NOT animate chart internals (recharts transitions) or add recharts `animationDuration` changes.
- Do NOT touch `AppTabContent.tsx` tab switching.
- Do NOT add dependencies.
- If a card's view switch also involves data loading, the fade should key on the view only, not on data arrival.

## Verification

- **Mechanical**: `npm run build` passes; `rg -n "isMounted" frontend/components/dashboard` returns zero hits; `rg -n "duration-700" frontend/components/dashboard` returns zero hits.
- **Feel check**:
  - Toggle a card's view (e.g. Weekly Sets radar ↔ heatmap): a 150ms fade bridges the swap — no white flash, no teleport.
  - Load the dashboard: cards appear immediately at full opacity (no fade-in lag on a daily screen).
  - Rapidly toggle views back and forth: each swap is a fast fade, never a lingering animation.
- **Done when**: view toggles crossfade in ≤150ms; the dead 700ms entrance is gone from the dashboard.
