# 007 — Fix dead animation utility classes (tooltips, badges, overlays)

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 7. Cohesion & tokens / 3. Physicality & origin
- **Estimated scope**: 6 files + index.html, ~40 lines

## Problem

Several components use Tailwind animation classes that **do not exist** in this project. Tailwind v4 ships only `animate-spin/ping/pulse/bounce`; `frontend/tailwind.css` defines no `--animate-*` tokens; `frontend/index.html` defines only `.animate-in`, `.fade-in`, `.slide-in-from-top-2`, `.slide-in-from-bottom-2`, `scaleIn` (lines 96-108). Every other class below silently does nothing — the "animations" never run:

```tsx
/* frontend/components/ui/Tooltip.tsx:37 — zoom-in-95 undefined; pure 0.3s fade (over the 125-200ms tooltip budget) */
className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"

/* frontend/components/historyView/ui/HistoryTooltipPortal.tsx:48 — same */
className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"

/* frontend/components/historyView/ui/HistoryView.tsx:192 — slide-in-from-bottom-8 + fill-mode-forwards + duration-500 all undefined */
className="space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards"

/* frontend/components/historyView/ui/HistorySessionExercises.tsx:51 — duration-300 is a transition-duration class, does nothing for the animation */
className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2 animate-in fade-in duration-300"

/* frontend/components/exerciseView/ui/ExerciseListRow.tsx:82,92 — zoom-in-50 undefined */
className={`px-2 py-0.5 rounded-full ... ${isSelected ? 'animate-in zoom-in-50 duration-200' : ''} ...`}

/* frontend/components/app/AppLoadingOverlay.tsx:155,199 — animate-fade-in undefined (overlay pops in with no animation) */
<div className="fixed inset-0 z-50 ... animate-fade-in px-4 sm:px-6">
```

AUDIT §3: tooltips/popovers must scale from their trigger (`scale(0.9–0.97)` + opacity, 125-200ms), not pure-fade.

## Target

1. Define the missing keyframes once in `frontend/index.html`'s style block (alongside `.animate-in`, matching existing conventions):

```css
/* frontend/index.html — add */
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.zoom-in-95 { animation: zoomIn 0.15s ease-out; }
.zoom-in-50 { animation: zoomIn 0.15s ease-out; }
```

2. Tooltips (`Tooltip.tsx:37`, `HistoryTooltipPortal.tsx:48`): drop the dead `zoom-in-95`/`animate-in fade-in` and use the real `.zoom-in-95` (150ms, ease-out — within the 125-200ms tooltip budget). These tooltips are positioned with inline `top`/`left` relative to their anchor — set `transform-origin` to the anchor edge by computing it from the same rect data already available in the component (e.g. origin `'top center'` when below the trigger, `'bottom center'` when above). At minimum set `transformOrigin: 'top center'` for the common below-anchor case.
3. `AppLoadingOverlay.tsx:155,199`: replace `animate-fade-in` with the existing `.animate-in` class (0.3s fade — fine for an occasional overlay; do not add movement).
4. `HistorySessionExercises.tsx:51` and `ExerciseListRow.tsx:82,92`: remove the dead classes (`duration-300`, `zoom-in-50`) and keep `.animate-in` (or drop animation entirely on the row badges — they toggle per selection at tens of times/day, so no animation is the correct answer for the badges; keep the 0.3s fade on the session grid only).
5. `HistoryView.tsx:192`: handled by plan 015 (the page-turn animation is deleted there, not defined).

## Repo conventions to follow

- Injected utility classes live in `frontend/index.html`'s `<style>` (`.animate-in`, `.fade-in`, `.slide-in-from-*` at lines 96-108). Add new keyframes there with the same `animation: <name> <dur> <easing>` one-liner style.
- Tooltip positioning data (`top`/`left`) already exists as inline styles in both tooltip components — reuse the same values for `transformOrigin`.
- `transition-all` on these tooltips is separately handled in plan 003 — coordinate so the final class reads `transition-[opacity,transform] duration-200 animate-in fade-in zoom-in-95` → replaced here with `transition-[opacity,transform] duration-200 zoom-in-95`.

## Steps

1. Add `@keyframes zoomIn`, `.zoom-in-95`, `.zoom-in-50` to `frontend/index.html`'s style block.
2. `Tooltip.tsx:37` + `HistoryTooltipPortal.tsx:48`: className → `"fixed z-[9999] pointer-events-none transition-[opacity,transform] duration-200 zoom-in-95"`, plus `style={{ ..., transformOrigin: 'top center' }}` (choose bottom when the tooltip renders above the anchor — match existing logic).
3. `AppLoadingOverlay.tsx:155,199`: `animate-fade-in` → `animate-in`.
4. `HistorySessionExercises.tsx:51`: `animate-in fade-in duration-300` → `animate-in fade-in`.
5. `ExerciseListRow.tsx:82,92`: remove `${isSelected ? 'animate-in zoom-in-50 duration-200' : ''}` → `${isSelected ? '' : ''}` (drop the badge animation; badge toggles are high-frequency).
6. Update plan 003's file list: Tooltip/HistoryTooltipPortal transition class is now `transition-[opacity,transform]` (covered by both plans; final state must match the Target above).

## Boundaries

- Do NOT define `slide-in-from-bottom-8`/`fill-mode-forwards` — plan 015 deletes their only usage.
- Do NOT add `tailwindcss-animate` or any dependency.
- Do NOT change tooltip positioning logic, only the animation classes + transformOrigin.
- If the session-grid fade in `HistorySessionExercises.tsx` causes visible flash on expand/collapse, report it; do not lengthen it.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Hover an exercise row in the exercise view: the tooltip scales in from near the trigger edge in ~150ms (previously it just appeared).
  - Open the loading overlay (CSV import): it fades in over 0.3s instead of popping.
  - Select a row status badge: appears instantly (no animation), no layout jump.
- **Done when**: `rg -n "zoom-in|fill-mode-forwards|slide-in-from-bottom-8|animate-fade-in" frontend --glob "*.tsx"` returns zero hits; tooltip entrance is a 150ms scale-from-trigger.
