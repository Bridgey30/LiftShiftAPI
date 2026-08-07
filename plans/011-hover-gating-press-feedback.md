# 011 — Gate hover transforms behind `pointer: fine` + add press feedback

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 3 files, ~15 lines

## Problem

Two calendar picker cells scale on hover with no pointer/reduced-motion gating — on touch devices a tap triggers the "hover" scale (sticky hover), and under reduced-motion the transform still fires (AUDIT §6: ungated `:hover` motion is a finding):

```tsx
/* frontend/components/modals/calendarSelector/CalendarWeekGrid.tsx:95 */
${weekStatus === 'none' && enabledWeek ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 hover:scale-105' : ''}

/* frontend/components/modals/calendarSelector/CalendarMonthRow.tsx:47 */
${disabled || !hasDataInMonth ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
```

Related: primary interactive elements have **no `:active` press feedback** anywhere (AUDIT §3: press feedback = `transform: scale(0.97)` on `:active`, 100-160ms). Only `AppLoadingOverlay.tsx:205` has an `active:bg-*` color change. The dock items magnify on hover but give zero press feedback on click (`PlatformDock.tsx:100`), and the hero CTA (`LandingPage.tsx:189`) has none.

## Target

1. Define a Tailwind v4 custom variant so `hover:scale-*` only applies to precision pointers:

```css
/* frontend/tailwind.css — add (outside @theme) */
@custom-variant pointer-fine (@media (hover: hover) and (pointer: fine));
```

   Then at the two calendar sites:

```tsx
/* CalendarWeekGrid.tsx:95 — target */
${weekStatus === 'none' && enabledWeek ? 'border-emerald-500/30 bg-emerald-500/10 pointer-fine:hover:bg-emerald-500/15 pointer-fine:hover:scale-105' : ''}

/* CalendarMonthRow.tsx:47 — target */
${disabled || !hasDataInMonth ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer pointer-fine:hover:scale-105'}
```

   (Keep the plain `hover:bg-*` color feedback — color is safe and cheap; gate only the transform.)

2. Press feedback on primary interactive elements (100-160ms budget):

```tsx
/* PlatformDock.tsx:100 (button) — add to className */
active:scale-[0.97] transition-transform duration-150 ease-out

/* LandingPage.tsx:189 (hero CTA) — add to className */
active:scale-[0.97] transition-transform duration-150 ease-out

/* AppLoadingOverlay.tsx:205 (reload button) — add to className */
active:scale-[0.97] transition-transform duration-150 ease-out
```

   If the element already has a `transition-colors`/`transition-all` class, replace the transition part with `transition-[color,background-color,transform]` or add the transform transition via `transition-transform` on a nested span — prefer the narrowest single transition list.

## Repo conventions to follow

- Tailwind v4 custom variants via `@custom-variant` is the framework-idiomatic approach (no plugins needed). `frontend/tailwind.css` is the config home.
- `active:` utilities are already used (`active:bg-slate-700` in AppLoadingOverlay.tsx:205) — extend, don't replace.
- Reduced-motion coverage comes from plan 001's global media query (the `:active` scale is a movement — plan 001's `transition-duration: 0.01ms` block neutralizes it under reduced motion automatically).

## Steps

1. Add the `@custom-variant pointer-fine` line to `frontend/tailwind.css`.
2. Update `CalendarWeekGrid.tsx:95` and `CalendarMonthRow.tsx:47` per Target #1.
3. Add `active:scale-[0.97]` + `transition-transform duration-150 ease-out` (or the narrow combined transition) to the three elements in Target #2. For PlatformDock, apply press feedback on the button's inner content element so it doesn't conflict with the Motion `scale` spring (see plan 004 step 6 — coordinate ownership: plan 004 adds the dock press feedback; this plan covers the CTA + reload button, and plan 004 covers the dock).
4. Optional (same pattern, executor judgment): other large CTAs that already carry `transition-colors`/`transition-all` — add `active:scale-[0.97]` + extend the transition property list. Keep it to ~5 primary CTAs max; do not touch nav links or list rows (high-frequency, no press feedback needed per AUDIT §1).

## Boundaries

- Do NOT add `active:scale` to high-frequency elements (nav tabs, list rows, pagination).
- Do NOT change color/hover logic — gating only.
- Do NOT add dependencies or plugins.
- Dock press feedback ownership: plan 004; if both plans run, plan 004's step 6 wins for PlatformDock.

## Verification

- **Mechanical**: `npm run build` passes (Tailwind v4 `@custom-variant` compiles; if the version in use predates it, fall back to the arbitrary variant `[@media(hover:hover)]:hover:scale-105` and note it in the plan status).
- **Feel check**:
  - Desktop: hovering calendar cells scales them 1.05; clicking-and-holding the hero CTA squishes it to 0.97 and releases.
  - DevTools device emulation (touch): tapping a calendar cell does not show a stuck scaled state; no persistent hover scale after tap.
  - Reduced-motion emulation: no scale anywhere; color feedback remains.
- **Done when**: calendar `hover:scale-105` only fires with a fine pointer; primary CTAs give 150ms press feedback; reduced-motion kills all transforms.
