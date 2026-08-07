# 013 — ReviewsCarousel: transform-based expansion, CSS marquee on mobile

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 5. Performance / 4. Interruptibility
- **Estimated scope**: 1 file, ~60 lines

## Problem

`frontend/components/landing/ui/ReviewsCarousel.tsx` (landing, occasional — two performance violations):

```tsx
/* ReviewsCarousel.tsx:340-368 — expanded card animates LAYOUT properties (left/top/width/height) at 0.55s with an overshooting back-out curve */
animate={{
  left: targetLeft,
  top: targetTop,
  width: expandedWidth,
  height: expandedHeight,
  rotateY: 180,
}}
transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}

/* ReviewsCarousel.tsx:148-182 — mobile marquee drives scrollLeft via rAF every frame (layout write), while the desktop marquee (259-272) correctly uses CSS keyframes */
el.scrollLeft = accumulatedRef.current;
```

## Target

1. **Expanded card**: animate `x`/`y`/`scale` transforms instead of geometry. Keep the `rotateY` flip and the playful back-out curve (landing delight), but apply it to transforms:

```tsx
/* ReviewsCarousel.tsx:340-368 — target */
initial={{
  x: originalRect.left,
  y: originalRect.top,
  scale: originalRect.width / expandedWidth,   /* so the scaled card visually matches the source card */
  rotateY: 0,
  opacity: 1,
  transformOrigin: 'top left',
}}
animate={{
  x: targetLeft,
  y: targetTop,
  scale: 1,
  rotateY: 180,
}}
exit={{
  x: originalRect.left,
  y: originalRect.top,
  scale: originalRect.width / expandedWidth,
  rotateY: 0,
  opacity: 0,
  transition: { opacity: { duration: 0.1, delay: 0.2 }, default: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
}}
transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
```

   The container becomes `position: fixed` at `0,0` with the `expandedWidth`/`expandedHeight` set as the element's base size (so `scale: 1` = expanded size); the source position is expressed purely as `x`/`y` offsets. The card's inner content scales up with the container (text will blur slightly during scale — acceptable, masked by the flip; do NOT add `filter: blur()` animation, see AUDIT §5 blur budget).

2. **Mobile marquee**: replace the rAF `scrollLeft` loop with the same CSS keyframe approach the desktop rows use (lines 259-272). Generate the per-row `@keyframes ${uid}` with the mobile row's translate range (compute `from`/`to` percentages so the track is exactly `2×` content width, same as desktop), set `animation-play-state: paused` while `isInteractingRef.current` is true (the existing `isInteracting` logic already tracks touch drag — keep it, but drive pause via the same `style` override used at line 271 instead of manual `scrollLeft` writes).

## Repo conventions to follow

- The desktop marquee (lines 259-272) is the in-repo exemplar: inline `<style>` + `@keyframes ${uid}` + `.${uid} { animation: ${uid} ${duration} linear infinite; }` + hover/pause via `animation-play-state`. Mirror it exactly for mobile.
- Motion `x`/`y`/`scale` + `transformOrigin` is the Motion v12 idiom already used in this file (e.g. `scale: pos.scale` at line 329).
- The back-out ease `[0.34, 1.56, 0.64, 1]` stays — the card flip is the page's playful centerpiece (AUDIT §7: playful can be bouncier); it only must not be applied to layout properties.
- Reduced-motion: plan 001's media query freezes the marquees (animation-duration 0.01ms); `useReducedMotion` may additionally short-circuit the expanded-card `x/y/scale` to an instant swap if the executor prefers.

## Steps

1. Restructure the `ExpandedCardOverlay` motion props per Target #1: fixed-position zero-origin container, base size = expanded size, initial/animate/exit in transform space (`x`/`y`/`scale`), `transformOrigin: 'top left'`, keep `rotateY` 180 and the 0.55→0.5s back-out (tighten to 0.5 only if the feel-check shows layout jank; otherwise keep 0.55).
2. Update the exit's `default` curve to `[0.4, 0, 0.2, 1]` (already present) — unchanged.
3. Replace the mobile marquee rAF effect (148-182): delete `el.scrollLeft = ...` writes; render mobile rows with the same `.${uid}` keyframe class as desktop (duplicating the card list like desktop does), with `animation-play-state: paused` applied via style when `isInteractingRef.current` flips.
4. Ensure the existing `handleExitComplete`/`AnimatePresence` (620-629) flow is untouched.

## Boundaries

- Do NOT change the review data, card layout, flip-on-hover logic, or `duration`/`speed` props.
- Do NOT add `filter: blur()` animations.
- Do NOT touch the desktop marquee (it is the correct exemplar).
- Do NOT add dependencies.
- If the scale-from-source approach causes the card's content to look wrong during the flip (aspect-ratio mismatch), adjust the base-size computation (width/height must preserve the card's aspect ratio at scale 1) and report the chosen formula in the plan status.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Click a review card: it flips/expands from its own position to full-screen via a scale+slide (no green layout-reflow regions in DevTools Rendering panel during the animation), then flips back with a subtle overshoot.
  - Mobile viewport (devices toolbar): the marquee scrolls at constant speed with no jank; grabbing/pausing it holds position; releasing resumes.
  - DevTools Animations panel: the marquee shows one long-running keyframe (not per-frame rAF updates).
- **Done when**: the expanded-card animation animates only `x`/`y`/`scale`/`rotateY`/`opacity`; the mobile marquee uses a CSS animation, and `scrollLeft` appears nowhere in the file.
