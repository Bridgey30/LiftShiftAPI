# 001 — Add global `prefers-reduced-motion` support

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 6. Accessibility
- **Estimated scope**: 2–3 files, ~80 lines

## Problem

The frontend has **zero** `prefers-reduced-motion` handling (verified: `rg "prefers-reduced-motion" frontend` and `rg "useReducedMotion" frontend` both return 0 matches). Every motion site below runs un-gated for users who request reduced motion, including continuous/infinite movement which is the worst offender:

- `frontend/components/landing/ui/ReviewsCarousel.tsx:259-271` — infinite `linear` marquee `@keyframes ${uid}`
- `frontend/components/landing/ui/HeroIllustration.tsx:193-197` — `@keyframes dash` infinite stroke loop; also `<animateMotion>` travelers (216-260) and the infinite `y` bob at 339
- `frontend/components/landing/ui/PlatformDock.tsx:54-73` — magnification springs
- `frontend/components/ui/ToastProvider.tsx:45-51` — `toast-slide-down` keyframe
- `frontend/components/app/AppLoadingOverlay.tsx:166-171,185` — 400ms slide ticker + `animate-spin`
- `frontend/components/modals/csvImport/CsvLoadingAnimation.tsx:21-26` — looping Lottie
- `frontend/components/ui/CountUp.tsx:32-38` — `useSpring` number counter (movement)
- `frontend/components/landing/ui/RedditCard.tsx:113` — `transition: 'transform 0.5s ease'` flip
- `frontend/components/modals/calendarSelector/CalendarWeekGrid.tsx:95` + `CalendarMonthRow.tsx:47` — `hover:scale-105`

AUDIT rule: reduced motion means **gentler, not zero** — keep opacity/color transitions that aid comprehension, drop position/movement.

## Target

1. Global CSS in `frontend/styles/base.css`:

```css
/* base.css — append */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

2. JS gating with `useReducedMotion()` (from `motion/react`) in:
   - `CountUp.tsx` — skip the spring, render the final value immediately.
   - `PlatformDock.tsx` — disable magnification (static size).
   - `HeroIllustration.tsx` — remove the infinite `y` bob and pause the auto-advance `setInterval` (line 285-298).
   - `ReviewsCarousel.tsx` — stop the mobile marquee rAF loop and the CSS marquee (set `animation-play-state: paused` or skip rendering the loop).

## Repo conventions to follow

- Global CSS lives in `frontend/styles/base.css` (imported by `frontend/tailwind.css`). Inline `<style>` blocks already exist per-component (ToastProvider, ReviewsCarousel) — for this plan, prefer the single global media query so nothing is missed.
- `useReducedMotion` is exported by the already-installed `motion` v12 package (`import { useReducedMotion } from 'motion/react'`) — no new dependencies.

## Steps

1. Append the `@media (prefers-reduced-motion: reduce)` block from Target #1 to the end of `frontend/styles/base.css`. This neutralizes every CSS keyframe animation and transition repo-wide.
2. `frontend/components/ui/CountUp.tsx`: add `const reduceMotion = useReducedMotion();`. When true, set the final text value once (`ref.current.textContent = formatValue(to)`) and skip the spring entirely (short-circuit the `useEffect`s that set `motionValue`).
3. `frontend/components/landing/ui/PlatformDock.tsx`: add `const reduceMotion = useReducedMotion();`. When true, render `DockItem`s at `BASE_SIZE` with no springs (`size`/`spacing`/`margin*` become constants).
4. `frontend/components/landing/ui/HeroIllustration.tsx`: add `const reduceMotion = useReducedMotion();`. When true, remove the `animate={{ y: [0, -4, 0] }}` prop (line ~339) and do not start the auto-advance `setInterval` (line ~285).
5. `frontend/components/landing/ui/ReviewsCarousel.tsx`: add `const reduceMotion = useReducedMotion();`. When true, skip the mobile rAF loop (`useEffect` at 148-182, return early) and pass `isPaused={true}` to the marquee rows (the `isPaused` prop already exists — it sets `animationPlayState: 'paused'` at line 271).

## Boundaries

- Do NOT touch `recharts` chart animations or chart component internals.
- Do NOT add dependencies.
- Do NOT change markup or layout — motion behavior only.
- Do NOT gate the `.animate-in`/`.fade-in` opacity classes behind "no animation" — those are opacity-only and should keep running (the media query above keeps them at 0.01ms which effectively disables them; if feel-check shows content appearing abruptly, accept it — reduced-motion users expect instant content).

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → reload landing page: marquee rows are static, hero illustration is still visible but nothing translates/scales/bobs, dock icons don't magnify on hover, toasts still fade in (opacity preserved if checked without the CSS block — confirm the block keeps 0.01ms so they effectively snap, which is correct).
  - Normal mode (no emulation): nothing changed — marquee/dock/bob all still animate.
- **Done when**: toggling reduced-motion in DevTools changes all listed sites to static while content remains visible and readable.
