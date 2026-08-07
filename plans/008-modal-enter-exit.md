# 008 — Modals and overlays: enter + exit motion (no teleports)

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities / 4. Interruptibility
- **Estimated scope**: 5 files, ~60 lines

## Problem

Several full-screen overlays and modals appear/disappear with **zero motion** (state teleports, AUDIT §8), and the only modal accordion animates a layout property with a dead exit:

```tsx
/* frontend/components/modals/ui/OnboardingModalShell.tsx:25-55 — plain conditional div, no enter/exit */
<div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">

/* frontend/components/app/AppCalendarOverlay.tsx:57-77 — backdrop + panel, no motion */
<div className="fixed inset-0 z-50 grid place-items-center p-4">
  <div className="absolute inset-0 bg-black/40" onClick={onClose} />

/* frontend/components/modals/auth/HevyLoginHelp.tsx:53-56 — height (layout) animated, exit never runs (no AnimatePresence in parent) */
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
>

/* frontend/components/modals/platform/UnifiedPlatformModal.tsx:352-353 — same height pattern; modal itself teleports in/out */
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
>

/* frontend/components/app/AppLoadingOverlay.tsx:150 + frontend/App.tsx:796 — overlay unmounts instantly when analysis completes */
if (!open) return null;
```

## Target

1. **Modal overlays** (OnboardingModalShell, UnifiedPlatformModal, AppCalendarOverlay): wrap in `AnimatePresence` and animate a centered modal entrance/exit — modals are exempt from trigger-origin rules, so `transform-origin: center`:

```tsx
/* target pattern */
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 ..."
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

   Durations: 200ms enter / 150ms exit, AUDIT `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`), scale range 0.96–1 (AUDIT §3: never `scale(0)`).

2. **AppLoadingOverlay**: when `isCompleting`/analysis finishes, keep it mounted for a 150-200ms exit fade (opacity only) before unmounting, or wrap the `{open && ...}` site in `App.tsx:796` with `AnimatePresence` + exit `{ opacity: 0 }` 150ms ease-out.

3. **Accordion** (HevyLoginHelp:53-56, UnifiedPlatformModal:352-353): replace the `height` animation with the CSS grid-rows technique (layout, but the standard cheap pattern for accordions — AUDIT §5 permits the executor to prefer this over transform hacks for collapse content):

```tsx
/* target accordion */
<div
  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
>
  <div className="overflow-hidden">...</div>
</div>
```

   And ensure the exit is real: wrap the accordion (or the whole help section) in `AnimatePresence` if the parent unmounts it, or keep it mounted with the grid-rows transition (preferred — no AnimatePresence needed for pure collapse).

## Repo conventions to follow

- `AnimatePresence` + `motion` from `motion/react` are already used in `LandingPage.tsx:425` and `ReviewsCarousel.tsx:620`.
- The curve `[0.23, 1, 0.32, 1]` is AUDIT `--ease-out` (plan 010 introduces the token; hard-code until then).
- Tailwind arbitrary transitions like `transition-[grid-template-rows,opacity]` are already used in the repo (TrainingTimelineCard.tsx:400).
- The modals dir (`frontend/components/modals/**`) currently has zero `AnimatePresence` — this plan introduces the pattern there.

## Steps

1. `UnifiedPlatformModal.tsx`: wrap the modal root in `<AnimatePresence>` (the parent decides `open`), convert root to `motion.div` with the Target #1 props. Apply the same to the accordion (Target #3).
2. `OnboardingModalShell.tsx:25-55`: same wrapper + motion.div treatment.
3. `AppCalendarOverlay.tsx:57-77` + its mount site `frontend/app/ui/AppShell.tsx:129-148`: wrap `{calendarOpen ? ... : null}` in `AnimatePresence`, add Target #1 props to the overlay root.
4. `HevyLoginHelp.tsx:53-56`: grid-rows accordion per Target #3; remove the `exit` prop (no longer needed).
5. `App.tsx:796` + `AppLoadingOverlay.tsx:150`: `AnimatePresence` around the overlay mount with exit `{ opacity: 0, transition: { duration: 0.15 } }`.

## Boundaries

- Do NOT change modal content, layout, z-index, or close logic.
- Do NOT touch the CSV import modal's Lottie animation.
- Do NOT add dependencies.
- If a modal's parent unmounts the modal with an inline conditional elsewhere (e.g. `{showModal && <X />}` in App.tsx or AppShell.tsx), wrap THAT site in `AnimatePresence` — report the exact site if it differs from the ones listed.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Open the calendar overlay: backdrop + panel fade/scale in over 200ms from center; close fades out ~150ms (previously instant).
  - Expand "How do I connect?" help accordion: content slides open via grid rows in 200ms; collapse animates back (previously jumpy height or instant).
  - Finish a CSV import: the loading overlay fades out instead of vanishing.
  - Open the platform modal: 200ms entrance, smooth.
  - DevTools → Rendering → reduced-motion: overlays snap (acceptable; opacity-only exit still preferred — confirm no position change animates).
- **Done when**: no modal/overlay in the app teleports; every entrance ≤200ms and exits ≤150ms.
