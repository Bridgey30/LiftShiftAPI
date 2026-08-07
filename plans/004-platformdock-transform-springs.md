# 004 — PlatformDock: transform-based springs, real spring config, press feedback

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 5. Performance / 2. Easing & duration / 3. Physicality
- **Estimated scope**: 1 file, ~50 lines

## Problem

`frontend/components/landing/ui/PlatformDock.tsx` animates **layout properties** with springs on every mousemove:

```tsx
/* PlatformDock.tsx:37 — current spring config */
const SPRING_CONFIG = { mass: 0.05, stiffness: 400, damping: 20 };

/* PlatformDock.tsx:54-73 — four springs per dock item */
const size = useSpring(
  useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [BASE_SIZE, MAGNIFICATION, BASE_SIZE]),
  SPRING_CONFIG
);
const spacing = useSpring(...);
const marginLeft = useSpring(useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [4, index > 0 ? 12 : 4, 4]), SPRING_CONFIG);
const marginRight = useSpring(...);

/* PlatformDock.tsx:85 — width/height driven by spring */
<motion.button ... style={{ width: size, height: size }}>
```

Problems:
- `width`/`height`/`marginLeft`/`marginRight` are layout properties (AUDIT §5: animate `transform` and `opacity` only) — every mousemove reflows the whole dock.
- `mass: 0.05` gives damping ratio ζ ≈ 2.24 → settles in ~20ms, so the "spring" is an instant snap; the magnification reads as a pop, not a fluid dock (AUDIT §2: spring configs must actually spring).

## Target

Keep fixed `width`/`height` (64px) and fixed `marginLeft`/`marginRight` (4px) on the button; apply magnification via `scale` and neighbor displacement via `x` — both transforms:

```tsx
/* PlatformDock.tsx — target config */
const SPRING_CONFIG = { type: "spring", duration: 0.4, bounce: 0.2 }; /* AUDIT Apple-style; snappy but fluid */
```

- Per item: `const scale = useSpring(useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [1, 1.25, 1]), SPRING_CONFIG);` where `MAGNIFICATION / BASE_SIZE = 80/64 = 1.25`.
- Neighbor displacement: for items within `DISTANCE` of the cursor, `const x = useSpring(useTransform(...))` that pushes the item horizontally by half the magnification delta of the item(s) next to it (signed by direction), capped at `(MAGNIFICATION - BASE_SIZE) / 2 * 0.5` ≈ 8px. `transform-origin: 'bottom center'`.
- Remove the `spacing`/`marginLeft`/`marginRight` springs entirely; the dock container keeps a fixed `gap`/margins.
- Add press feedback: `className` gains `active:scale-[0.97]` and `transition-transform duration-160 ease-out` (AUDIT §3 press feedback: `scale(0.97)` on `:active`, 100-160ms).

`style={{ width, height, marginLeft, marginRight, x, scale }}` becomes `style={{ x, scale, transformOrigin: 'bottom center' }}` on a fixed-size button; the scale spring must not fight the `active:` CSS transform — apply `active:scale-[0.97]` to an inner element or accept that Motion's inline transform wins over the Tailwind class (verify in feel check and choose the structure that keeps press feedback visible).

## Repo conventions to follow

- `useSpring`/`useTransform`/`useMotionValue` are already imported from `motion/react` in this file — no new imports beyond `type: "spring"` object config (Motion v12 supports `{ type: "spring", duration, bounce }`).
- The dock is a landing-page delight element (occasional use) — a bouncy spring is on-personality here (AUDIT §7: playful can be bouncier).
- Reduced-motion branch comes from plan 001 (static `BASE_SIZE`, no springs).

## Steps

1. Replace `SPRING_CONFIG` with `{ type: "spring", duration: 0.4, bounce: 0.2 }`.
2. Replace the `size` spring (width/height) with a `scale` spring: input range `[-DISTANCE, 0, DISTANCE]` → `[1, 1.25, 1]`.
3. Remove `spacing`/`marginLeft`/`marginRight` springs; set static `marginLeft`/`marginRight` 4px (or a fixed 8px gap on the container) in the className/style.
4. For the two immediate neighbors of the hovered item, add an `x` transform spring pushing them apart by up to 8px (half the extra 16px width of the magnified neighbor). Simpler acceptable alternative if neighbor spread proves fiddly: only the hovered item scales (macOS "over-bounce" style) with no neighbor movement.
5. Update the `style` prop: `{ x, scale, transformOrigin: 'bottom center' }` on the fixed-size `motion.button`.
6. Add press feedback: `active:scale-[0.97]` + `transition-transform` (160ms) on the button, on an inner element so it doesn't fight Motion's `scale` style.
7. Keep the label/badge crossfade behavior unchanged.

## Boundaries

- Do NOT change `BASE_SIZE` (64), `MAGNIFICATION` (80), or `DISTANCE` (120).
- Do NOT change the badge, tooltip, or click-handling logic.
- Do NOT add dependencies.
- If the dock container layout makes `x`-based neighbor spread visually wrong, use the "hovered item scales in place" alternative from step 4 rather than reverting to layout springs.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - DevTools → Animations panel at 10% playback: move the mouse across the dock — the hovered icon scales smoothly from its own bottom edge (not center), neighbors push apart with a slight bounce, and no layout boxes resize (enable "Highlight layout/paint" in Rendering panel: no green reflow regions on mousemove).
  - Click and hold a dock icon: it scales to 0.97 and releases.
  - Compare to a real macOS dock: the motion should feel like a fluid spring, not a pop.
- **Done when**: mousemove across the dock triggers zero layout reflow (Rendering panel), magnification reads as a spring, and press feedback is visible on hold.
