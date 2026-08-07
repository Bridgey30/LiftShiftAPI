# 012 — HeroIllustration: ease-out exits, gentle entrance, gate the infinite loops

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 2. Easing & duration / 6. Accessibility
- **Estimated scope**: 1 file, ~30 lines

## Problem

`frontend/components/landing/ui/HeroIllustration.tsx` (landing page hero, occasional — but contains two rule violations):

```tsx
/* HeroIllustration.tsx:314-316 — pure-fade entrance, no initial transform, 0.6s */
<motion.div
  className="absolute inset-y-0 right-0 ..."
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.6, delay: 0.2 }}
>

/* HeroIllustration.tsx:334-336 — easeIn on an exit: starts slow, delaying the moment the user watches most (AUDIT §2: ease-in on UI is always a finding) */
exit={{
  opacity: 0,
  scale: 0.82,
  rotate: -18,
  x: '-26%',
  transition: { duration: 0.3, ease: 'easeIn' },
}}

/* HeroIllustration.tsx:338-343 — infinite y-bob on every card, always running */
<motion.div
  animate={{ y: [0, -4, 0] }}
  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: slotIdx * 0.5 }}
>

/* HeroIllustration.tsx:285-298 — 3s auto-advance setInterval, no pause */
}, 3000);
```

## Target

```tsx
/* HeroIllustration.tsx:314-316 — target: physical entrance, under 300ms + useReducedMotion skip */
initial={{ opacity: 0, scale: 0.94 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}   /* AUDIT --ease-out */

/* HeroIllustration.tsx:334-336 — target: exits decelerate */
exit={{
  opacity: 0,
  scale: 0.82,
  rotate: -18,
  x: '-26%',
  transition: { duration: 0.3, ease: 'easeOut' },
}}

/* HeroIllustration.tsx:338-343 — target: bob gated by useReducedMotion */
{!reduceMotion && (
  <motion.div
    animate={{ y: [0, -4, 0] }}
    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: slotIdx * 0.5 }}
  >
    ...
  </motion.div>
)}
```

Auto-advance `setInterval` (line 285-298): also gate behind `useReducedMotion()` (don't start the interval) and add a `clearInterval`/pause when the user hovers the illustration container (add `onMouseEnter`/`onMouseLeave` to pause/resume — the interval currently never pauses).

The dash loop (lines 193-197, `animation: dash 1.5s linear infinite`) and `<animateMotion>` travelers are continuous-motion marketing elements — plan 001's global media query neutralizes them; no per-file change needed beyond what 001 does.

## Repo conventions to follow

- `motion/react` is already imported here (`motion`, `AnimatePresence` in use). `useReducedMotion` comes from the same package.
- Curve `[0.23, 1, 0.32, 1]` = AUDIT `--ease-out`; token lands in plan 010 (`ease-out`), so the executor may use `ease: 'easeOut'` only if it means the tokenized strong curve after plan 010 — otherwise hard-code the bezier.
- The hero is a marketing/delight element: 0.4s entrance is acceptable per AUDIT §2 (marketing can be longer), and a small bounce-free scale is on-personality.

## Steps

1. Add `const reduceMotion = useReducedMotion();` to the component.
2. Entrance (314-316): add `scale: 0.94` to `initial`, `scale: 1` to `animate`, change transition to `{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }`.
3. Exit (334-336): `ease: 'easeIn'` → `ease: 'easeOut'`.
4. Bob (338-343): wrap in `{!reduceMotion && (...)}`.
5. Auto-advance interval (285-298): don't start when `reduceMotion`; add hover pause (onMouseEnter clears the interval, onMouseLeave restarts it) unless the component already has such handling — verify.

## Boundaries

- Do NOT change the phone-card positions, image assets, `<animateMotion>` SVG paths, or the `POSITIONS` constant.
- Do NOT touch other landing components (ReviewsCarousel is plan 013).
- Do NOT add dependencies.
- If the hover-pause conflicts with an existing `onMouseEnter` handler, merge into it rather than double-binding.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Landing loads: the phone stack scales in from 0.94 → 1 in 0.4s (no longer a plain crossfade); the stack swap (3s cycle) exits with deceleration — the outgoing card leaves briskly, not dragging.
  - Hover the illustration: the auto-advance pauses.
  - Reduced-motion emulation: no bob, no auto-advance, entrance still fades (opacity) or appears instantly — either is correct.
  - DevTools Animations panel at 10%: entrance starts fast (curve front-loaded).
- **Done when**: no `easeIn`/`ease-in` remains in the file; infinite loops are reduced-motion-gated; entrance has a transform.
