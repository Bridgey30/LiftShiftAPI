# 006 — CountUp: honest duration, no false spring, no replay on tab return

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 2. Easing & duration / 1. Purpose & frequency / 6. Accessibility
- **Estimated scope**: 2 files, ~40 lines

## Problem

`frontend/components/ui/CountUp.tsx:32-38` builds a spring whose physics don't match its `duration` prop, and its consumers replay it on high-frequency mount:

```tsx
/* CountUp.tsx:32-38 — current */
const damping = 20 + 40 * (1 / duration);
const stiffness = 100 * (1 / duration);
const springValue = useSpring(motionValue, { damping, stiffness });
```

- Default `duration = 2` → `damping = 40`, `stiffness = 50` → damping ratio ζ = 40/(2·√50) ≈ **2.83** (heavily overdamped — this "spring" never springs; it is a slow creep, and at `duration < 1` the config becomes even more sluggish).
- The actual settle time is ~0.2s but `onEnd` fires at exactly `delay + duration` (CountUp.tsx:88-95), so `duration` advertises a 2s count that finishes in ~0.2s, and `onStart`/`onEnd` are decoupled from the visible animation.

Frequency: `frontend/components/insights/KPICard.tsx:134-141` renders `<CountUp from={0} to={value} ... duration={1} />`, and `frontend/components/app/AppTabContent.tsx:93` unmounts/remounts `Dashboard` on every tab switch (`{activeTab === Tab.DASHBOARD && ...}`) — so the count-up replays from zero every time the user returns to the Dashboard tab, a 100+/day action. AUDIT §1: that frequency tier gets no animation.

## Target

1. **CountUp counts for exactly `duration`** using a tween with the AUDIT strong ease-out curve, driven by Motion's `animate()` (imported from `motion/react`), with `onEnd` tied to actual completion:

```tsx
/* CountUp.tsx — target */
import { animate, useInView, useReducedMotion } from 'motion/react';

// inside component:
const reduceMotion = useReducedMotion();
...
useEffect(() => {
  if (!isInView || !startWhen || !ref.current) return;
  const controls = animate(from, to, {
    duration: reduceMotion ? 0 : duration,
    ease: [0.23, 1, 0.32, 1],            /* AUDIT --ease-out */
    delay,
    onUpdate: (v) => { if (ref.current) ref.current.textContent = formatValue(v); },
    onComplete: () => onEnd?.(),
  });
  onStart?.();
  return () => controls.stop();           /* interruptible */
}, [isInView, startWhen, from, to, duration, delay, ...]);
```

   - Remove the `useSpring`/`useMotionValue` machinery entirely.
   - `useReducedMotion()` → render the final value instantly (duration 0) but still fire `onStart`/`onEnd`.

2. **No replay on tab return** — animate once per session. In `frontend/components/insights/KPICard.tsx`, hoist a module-level flag:

```tsx
/* KPICard.tsx — target */
let countedUpThisSession = false;  // module scope
...
const shouldAnimate = !countedUpThisSession;
countedUpThisSession = true;       // in the render or a ref-driven effect
// pass to <CountUp startWhen={shouldAnimate} />
```

   After the first animation in a session, `CountUp` renders its final value instantly (its `useEffect` at line 52-57 already writes the final value when `startWhen` is false — keep that path, ensuring the *final* value is written, not `from`).

3. Default `duration` stays 2s only for `startWhen`-gated first-run delight; consumers that are visible often (KPICard) use `startWhen` with the session flag or pass `duration={0}`-equivalent via `startWhen={false}` after first run.

## Repo conventions to follow

- `animate()` from `motion/react` is the Motion v12 API (already a dependency). `useInView` is already used in this file.
- The curve `[0.23, 1, 0.32, 1]` is AUDIT's `--ease-out` (AUDIT.md §2) — becomes the `--ease-out` token in plan 010; hard-code for now.
- CountUp is used across dashboard cards (KPICard, dashboard summary cards, flex view) — keep its public props identical so no consumer breaks.

## Steps

1. Rewrite `CountUp.tsx` per Target #1: swap `useMotionValue`/`useSpring` for `animate()`, remove the derived `damping`/`stiffness` math, keep the `formatValue` logic and `direction`/`separator` props.
2. Keep the initial-value `useEffect` (lines 52-57) but make it write the final value `to` when `!startWhen` (fix the existing behavior where it writes `from` — currently line 54-57 sets text to the start value when not started; change to `to` so non-animated renders show the real number).
3. Add `useReducedMotion()` branch (duration 0).
4. In `KPICard.tsx`, add the module-level session flag from Target #2 and pass `startWhen={shouldAnimate}` to `<CountUp>`. Set the flag on first render (e.g. `useEffect(() => { countedUpThisSession = true; }, [])`).
5. Sweep other `CountUp` consumers (`rg -n "<CountUp" frontend --glob "*.tsx"`) — leave them as-is unless they are known to mount per-tab-switch; if one is, apply the same session-flag pattern.

## Boundaries

- Do NOT change the CountUp public API (props stay: `to`, `from`, `direction`, `delay`, `duration`, `className`, `startWhen`, `separator`, `onStart`, `onEnd`).
- Do NOT touch recharts charts.
- Do NOT add dependencies.
- If a consumer depends on `onStart`/`onEnd` firing at `delay + duration` exactly, they now fire at actual animation end — verify each consumer (rg for `onStart=`/`onEnd=` on CountUp) still behaves; report drift rather than hacking timing.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Dashboard loads: a KPI counts from 0 to its value in exactly `duration` seconds, easing out (fast start, gentle landing — no creep, no visible "finished before onEnd" gap).
  - Switch to History tab and back to Dashboard: numbers appear instantly (no replay).
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: numbers appear at final value instantly; `onStart`/`onEnd` still fire.
  - Soft-reload mid-count: the count stops cleanly (interruptible).
- **Done when**: count duration matches `duration` within ~50ms, tab-return shows no replay, and reduced-motion renders instantly.
