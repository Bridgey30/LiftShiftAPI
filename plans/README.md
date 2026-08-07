# Animation Improvement Plans

Audit of the LiftShift motion surface at commit `09b877d`, produced by `improve-animations` (deep effort). Every finding was vetted at its `file:line`. Plans are self-contained — any agent can execute one with zero context from the audit.

## Findings summary

| # | Severity | Category | Location | Finding | Fix |
| --- | --- | --- | --- | --- | --- |
| 001 | HIGH | A11y | repo-wide | Zero `prefers-reduced-motion` handling; marquee/dash/bob/dock springs/toast slide/lottie un-gated | Global media query + `useReducedMotion()` in 4 components |
| 002 | HIGH | Perf | index.html:113-125 | Universal `*` transition on every element + `transition: all 0.3s` on all chart cards | Delete universal rule; scope card hover to `box-shadow` |
| 003 | HIGH | Perf | ~65 files, 99 hits | `transition-all` everywhere (incl. fixed-position tooltips re-positioned per mousemove) | Scoped property transitions per element |
| 004 | HIGH | Perf | PlatformDock.tsx:37-100 | Springs on `width/height/margin*` (layout reflow per mousemove); `mass: 0.05` → 20ms settle = pop, not spring | Transform-based scale/x springs + press feedback |
| 005 | HIGH | Interrupt. | ToastProvider.tsx:27-58 | Keyframe enter on rapidly-stacked toasts; no exit at all (instant vanish); stack jump | `AnimatePresence` + `layout`, 200ms enter / 150ms exit |
| 006 | HIGH | Easing | CountUp.tsx:32-95 | ζ≈2.83 overdamped "spring" settles in 0.2s but advertises `duration=2`; `onEnd` decoupled; replays on every tab return (KPICard) | Tween with exact duration + `onEnd`; session-once flag |
| 007 | HIGH | Cohesion | 6 files | Dead animation classes (`zoom-in-95/50`, `slide-in-from-bottom-8`, `fill-mode-forwards`, `animate-fade-in`) — tooltips/overlays/badges never animate | Define real keyframes; tooltip scale-from-trigger 150ms |
| 008 | MED | Missed opp. | modals/** | All modals/overlays teleport (no enter/exit); accordion animates `height`, exit never runs | 200ms center fade+scale, `AnimatePresence`, grid-rows accordion |
| 009 | MED | Purpose | HistorySetRow.tsx:89-180 | Infinite shimmer + `animate-pulse` on every PR row/badge in daily-seen list | Delete (static tint) |
| 010 | MED | Cohesion | tailwind.css + 4 files | No motion tokens; four 700ms hovers; near-duplicate hand-typed beziers | `@theme` `--ease-*` tokens; 200ms hovers; dedupe curves |
| 011 | MED | A11y | CalendarWeekGrid/MonthRow + CTAs | Ungated `hover:scale-105` (fires on touch/reduced-motion); no `:active` press feedback on CTAs | `@custom-variant pointer-fine`; `active:scale-[0.97]` 150ms |
| 012 | MED | Easing | HeroIllustration.tsx:285-343 | `easeIn` exit; pure-fade 0.6s entrance; infinite bob; 3s auto-advance never pauses | ease-out exit; scale 0.94 entrance 0.4s; gate loops |
| 013 | MED | Perf | ReviewsCarousel.tsx:148-182,340-368 | Expanded card animates `left/top/width/height` (layout) 0.55s; mobile marquee rAF `scrollLeft` writes | Transform-based expand; CSS keyframe marquee |
| 014 | MED | Missed opp. | 7 dashboard cards + Dashboard.tsx:69 | View-mode toggles teleport; mount entrance is inert dead code (`isMounted` always true) | 150ms crossfade on view key; delete dead entrance |
| 015 | MED | Purpose | HistoryView.tsx:192 | Whole list re-fades on every pagination click; dead `slide-in-from-bottom-8` | Delete animation (frequent action) |

**Verdict: Block.** Multiple feel-breaking and universal issues — no reduced-motion support, universal `transition: all`, `transition: all` at scale, layout-property springs, no toast exits, an inert-and-wrong count-up.

## Recommended execution order

1. **001** (reduced-motion) — global, touches nothing conflict-prone
2. **002** (universal transitions) — global CSS; do before 003 so the sweep only sees explicit classes
3. **003** (transition-all sweep) — depends on 002
4. **005** (toasts) — small, self-contained, high frequency
5. **006** (CountUp) — small; note: 010 may change `ease-out` meaning afterward — acceptable
6. **009** (history shimmer/pulse) — trivial deletion
7. **015** (pagination) — trivial deletion; do with 009 (same area)
8. **004** (PlatformDock) — medium; coordinate press feedback with 011
9. **011** (hover gating + press feedback) — coordinate dock press feedback with 004
10. **007** (dead classes) — coordinate Tooltip class with 003
11. **008** (modals) — medium; coordinate overlay sites with App.tsx
12. **014** (chart crossfades) — coordinate card class removal with 003
13. **012** (HeroIllustration) — independent
14. **013** (ReviewsCarousel) — independent, largest single diff
15. **010** (tokens) — last: it globalizes `ease-out`; confirm no regressions after all other plans landed

## Dependencies

- 003 waits on 002.
- 004 and 011 both touch PlatformDock press feedback (004 wins).
- 003 and 007 both touch Tooltip/HistoryTooltipPortal transition classes (final state in 007's Target).
- 003, 010, 014 all touch the seven dashboard cards' classes (014 owns the final state; 003 skips them; 010 owns the four 700ms hover sites).
- 001 is a prerequisite for correct feel-verification of every other plan (reduced-motion checks).

## Status

All 15 plans **DONE** (executed 2026-08-07; prefs: snappier durations at fast end of budget, CountUp default 1s, chart view crossfades 150ms, tooltip/toolbar/press 100-160ms).

| # | Notes |
| --- | --- |
| 001 | Global `prefers-reduced-motion` block in `styles/base.css`; JS gates via `useReducedMotion()` in PlatformDock, CountUp, HeroIllustration |
| 002 | Universal `*` transition deleted from index.html; chart-card hover scoped to box-shadow; `zoomIn` keyframes added using `scale` property (composes with tooltip `translateX(-50%)`) |
| 003 | 69 `transition-all` → scoped (69+28 sites, 18 skipped with judgment: dashoffset rings kept, grid-row collapses kept at 300ms) |
| 004 | PlatformDock rewritten: transform springs (scale/x only), fixed 64px buttons, `active:scale-[0.97]` press, reduced-motion static. **REVERTED 2026-08-07 at user request** — restored original width/height/margin springs (HEAD version) |
| 005 | ToastProvider: AnimatePresence + layout, 160ms enter / 150ms exit, `[0.23,1,0.32,1]` |
| 006 | CountUp rewritten with motion `animate()`, exact duration (default 1s), onStart/onEnd wired; KPICard session-once flag |
| 007 | Tooltips/overlays → `transition-[opacity,transform] duration-100 zoom-in-95` + transformOrigin flip; dead classes removed |
| 008 | AppLoadingOverlay (AnimatePresence exit 150ms), OnboardingModalShell scale 0.97→1 160ms, AppCalendarOverlay fade, HevyLoginHelp + UnifiedPlatformModal accordions → transform-based mount reveal |
| 009 | Shimmer + `animate-pulse` removed from HistorySetRow badges (static tint kept) |
| 010 | `--ease-out/--ease-in-out/--ease-drawer` tokens in `@theme`; three 700ms ring hovers → `transition-[stroke-dashoffset,stroke] duration-200 ease-out` (HistorySessionHeaderCard:96 was already 200ms via 003); TrainingTimelineCard pulse → `var(--ease-in-out)` |
| 011 | `@custom-variant pointer-fine`; calendar hovers gated; CTAs/reload get 150ms press feedback |
| 012 | HeroIllustration: scale 0.94→1 entrance 0.4s strong curve, easeOut exit, bob gated, auto-advance gated + hover-pause |
| 013 | ReviewsCarousel: expanded card now animates `x/y/scale/rotateY` (fixed 0,0 origin, base size = expanded, `transformOrigin: top left`); mobile marquee → CSS keyframes + touch-pause; zero `scrollLeft` |
| 014 | `isMounted` plumbing deleted from 7 cards + Dashboard/DashboardLayout/PrimaryCharts/ChartBits/TopExercisesHeader; `duration-700` dead entrance gone; grid fade tightened to 0.2s. **Keyed view-switch crossfades REVERTED 2026-08-07 at user request** (charts now swap instantly / recharts replays as before) |
| 015 | HistoryView list animation deleted (`space-y-2 sm:space-y-3`) |

Remaining known items: 18 skip-list `transition-all` cases in plan 003 (rings, grid-row collapses — intentionally kept); `UserPreferencesModal.tsx:133` missing `lightBgChoice` prop is a pre-existing unrelated error.

Review diffs against the `review-animations` bar before releasing.
