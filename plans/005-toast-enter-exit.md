# 005 — Toast enter/exit animations with interruptible stacking

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 4. Interruptibility / 2. Easing & duration
- **Estimated scope**: 1 file, ~40 lines

## Problem

`frontend/components/ui/ToastProvider.tsx`:
- Toasts **enter** via a CSS keyframe (line 45-51) — keyframes restart from zero, so a rapidly re-shown toast re-plays from the start (AUDIT §4: keyframes on toasts are a finding).
- Toasts **exit with no animation at all** — `removeToast` (lines 27-28) and the auto-dismiss `setTimeout` (lines 35-37) just filter the state, so toasts vanish instantly.
- When a new toast stacks onto existing ones in the `flex flex-col` column (line 54), the existing toasts jump down with no layout transition.

```tsx
/* ToastProvider.tsx:27-37 — current removal (no exit) */
const removeToast = useCallback((id: string) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);
...
setTimeout(() => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}, duration);

/* ToastProvider.tsx:45-58 — current enter (keyframe) */
<style>{`
  @keyframes toast-slide-down {
    from { opacity: 0; transform: translateY(-0.75rem) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-toast-slide-down {
    animation: toast-slide-down 0.3s ease-out forwards;
  }
`}</style>
...
<div ... className="... animate-toast-slide-down ...">
```

## Target

Replace the keyframe with Motion `AnimatePresence` + `layout` so enter, exit, and stack-shift are all interruptible transitions/springs:

```tsx
/* ToastProvider.tsx — target */
<AnimatePresence>
  {toasts.map((t) => (
    <motion.div
      key={t.id}
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto rounded-lg border px-3 py-2.5 ..."
    >
      ...
    </motion.div>
  ))}
</AnimatePresence>
```

- Enter/exit: `duration: 0.2`, AUDIT `--ease-out` curve `cubic-bezier(0.23, 1, 0.32, 1)`. Duration is within the 125-250ms budget for this element class.
- `layout` makes the stack shift smoothly when toasts are added/removed (Motion animates the layout shift with the same transition; if it feels slow, set `transition={{ layout: { duration: 0.15 } }}`).
- Remove the `<style>` block and the `animate-toast-slide-down` class.
- Exit duration 0.15s is acceptable — it's a system response to a deliberate dismissal (asymmetric, AUDIT §4).

## Repo conventions to follow

- `AnimatePresence` + `motion` are already used in `frontend/components/landing/ui/LandingPage.tsx:425` and `ReviewsCarousel.tsx:620` — same import (`motion/react`) and pattern.
- Reduced-motion: covered by plan 001's global media query (0.01ms transitions); optionally add `useReducedMotion()` → drop `y`/`scale`, keep opacity.

## Steps

1. Import `AnimatePresence, motion` from `motion/react` (already a dependency) in `ToastProvider.tsx`.
2. Delete the `<style>{...}</style>` block (lines 44-53) and the `animate-toast-slide-down` class usage.
3. Wrap the toasts `{toasts.map(...)}` in `<AnimatePresence>` and convert the toast `<div>` to `<motion.div>` with `key={t.id}`, `layout`, and the initial/animate/exit/transition props from the Target.
4. Add `layout` transition tweak if the stack-shift feels slow (see Target).
5. Keep `addToast`/`removeToast` logic unchanged.

## Boundaries

- Do NOT change toast styling, content, duration logic, or the dismiss button.
- Do NOT touch other files.
- Do NOT add dependencies.
- If `AnimatePresence` exit requires the toast's parent to stay mounted, ensure the container div (`fixed top-20 right-2 ...`) remains rendered unconditionally (it already is).

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Trigger several toasts in quick succession (import a CSV, or call `addToast` repeatedly): each fades/slides in 200ms, the stack shifts smoothly, and spamming does not restart any keyframe from zero.
  - Dismiss a toast (click the X): it fades/shrinks out in ~150ms instead of vanishing.
  - Auto-dismiss after 3s: same exit animation.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: toasts appear instantly (opacity snap is fine).
- **Done when**: every toast enter, stack-shift, and exit is a transition (no keyframes), all under 250ms.
