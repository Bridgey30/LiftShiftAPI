# Strength Balance — Exercise Ratio Anomaly Detection

Feature proposal: compare a user's strength across popular exercises against
established strength ratios, and surface a warning when their profile is
outside the typical band.

---

## 1. Concept

For any two related exercises (same joint, same action family), lifters
predictably exhibit a strength ratio. Examples: overhead press is ~60–70% of
bench press; a dumbbell side raise is ~35–60% of a dumbbell shoulder press
(per arm). When a user's ratio falls far outside that band, it usually signals
one of:

- a genuine strength imbalance (delts lagging, back lagging, quads:hammies)
- technique / range-of-motion conventions
- programming (one movement trained, the other skipped)
- a logging artifact

The feature computes each user's ratio from their logs and flags outliers.

**Framing matters (see §6).** The app must say "X is far behind Y for most
lifters" — never "your form is wrong." The app cannot see form, and the
community explicitly rejects single-number verdicts. These are diagnostic
hints, not diagnoses.

---

## 2. What the research says (researched Aug 2026)

### High-confidence pairs (ship first)

| Pair A : B (1RM) | Expected ratio A/B | Band | Basis | Confidence |
|---|---|---|---|---|
| Bench : OHP | 1.45–1.65 (OHP ≈ 60–70% of bench, ~64% median) | 1.25–1.9 | ExRx/Kilgore + StrengthLevel crowd data (agree within ~3%) | High |
| DB Shoulder Press : DB Lateral Raise (per arm) | 1.7–2.9 (raise ≈ 35–60% of press; ~50% intermediate) | 1.2–3.3 | StrengthLevel lateral-raise tables (1.2M lifts); r/Fitness 2014 thread corroborates ~50% | High (as crowd data; "1RM" of a raise is really a working weight) |
| Incline Bench : Flat Bench | 0.85–0.95 (incline ≈ 90% of flat) | 0.7–1.15 | StrengthLevel comparison pages | High (crowd) / Low-Medium as a universal rule (angle-dependent) |
| Squat : Bench | 1.30–1.50 (median ~1.35–1.45) | 1.2–1.7 | **JSAMS 2024, n=809,986 competition entries**; OpenPowerlifting; ExRx; SL | High |
| Deadlift : Bench | 1.50–1.80 (median ~1.6–1.7) | 1.4–2.0 | JSAMS 2024; OpenPowerlifting; ExRx | High |
| Deadlift : Squat | 1.10–1.25 (median ~1.15–1.18) | 1.0–1.35 | JSAMS 2024; OpenPowerlifting; ExRx | High |
| Row : Bench (push:pull) | 0.85–0.95 | 0.7–1.15 | StrengthLevel; coaching consensus | Medium (no peer-reviewed push:pull load ratio exists) |
| Lat Pulldown : Bench | ~0.85 | 0.7–1.05 | StrengthLevel | Medium |

### Medium-confidence pairs (ship later)

| Pair A : B | Expected ratio A/B | Band | Basis | Confidence |
|---|---|---|---|---|
| Front Squat : Back Squat | 1.18–1.33 (~0.8x) | 1.05–1.5 | StrengthLevel; coaching consensus | Medium |
| Leg Curl : Leg Extension | 0.60–0.80 (machine weights) | 0.4–1.0 | StrengthLevel; isokinetic H:Q research (different scale) | Medium (isokinetic well-studied, machine weights not) |
| Bicep Curl : Triceps Pushdown | 0.75–1.0 | 0.6–1.2 | StrengthLevel | Medium |
| Romanian Deadlift : Deadlift | 1.18–1.33 (~0.8x) | 0.6–1.05 | StrengthLevel | Low |
| Leg Press : Squat | 1.4–2.0 | — | StrengthLevel; machine-dependent | Low — skip |

### Key research findings

1. **The big-3 ratios are remarkably stable** — JSAMS 2024 (809,986 drug-tested,
   unequipped competition entries) shows squat:bench, deadlift:bench, and
   deadlift:squat are nearly flat from 10th→90th percentile and across weight
   classes. This is the strongest evidence that "golden ratios" exist for the
   big lifts.
2. **Assistance-lift ratios are crowd statistics, not science.** StrengthLevel
   (28M users) and SymmetricStrength (world-record-ratio method) are the only
   sources. Widen bands for isolation moves (±20%) vs big three (±10%).
3. **Untrained lifters have compressed ratios** (ExRx untrained squat:bench ≈
   0.92 vs 1.38 elite). Suppress flags for low-data / low-experience users.
4. **No published data exists** for push:pull load ratios, hip thrust, calf
   raises, or row:bench — those rest on coaching consensus. Copy must not
   over-claim.
5. **Bodyweight cancels out in a ratio of two e1RMs** — no bodyweight input is
   needed, EXCEPT for bodyweight-based exercises (pull-up, chin-up, push-up),
   where total load = bodyweight + added weight. Pull-up pairs require a
   bodyweight setting, so **skip pull-up pairs in v1** and use pulldown/row
   instead.

### Community validation (the human signal)

- Lifters DO use exercise-vs-exercise ratios as diagnostics — the r/Fitness
  "diagnostic tool" thread on lateral raises is the exact use case.
- Consensus target: OHP ≈ 2/3 bench (Josh Bryant: non-elite lifters should
  maintain ~70% bench:OHP). Red flag at OHP < ~52–55% of bench.
- Community rejects hard thresholds ("there is no set ratio, everyone is
  different") and resents standards sites cited as authority. Cite as
  "population statistics."
- SymmetricStrength (the direct precedent app) is widely used and its
  within-you comparison is valued; its per-muscle scores are treated as
  entertainment.

---

## 3. What data supports this today

Validated against `frontend/public/exercises_muscles_and_thumbnail_data.csv`
(6,850 exercises) — all v1 pair canonical names exist and resolve through the
existing alias/fingerprint system (`frontend/utils/exercise/exerciseNameResolver.ts`):

- Barbell Bench Press, Incline Bench Press, Push Up
- Shoulder Press, Shoulder Press (Dumbbell), Shoulder Press (Machine Plates)
- Lateral Raise (Dumbbell), Lateral Raise (Cable), Lateral Raise (Machine)
- Barbell Bent Over Row, Bent Over Row (Barbell), Seated Cable Row
- Lat Pulldown, Pull Up, Chin Up
- Barbell Squat, Front Squat, Leg Press (Machine)
- Deadlift, Barbell Deadlift, Romanian Deadlift
- Leg Extension (Machine), Leg Curl (Machine), Barbell Curl,
  Triceps Pushdown, Skullcrusher (Barbell), Face Pull

Hevy CSV export format (confirmed from `frontend/public/sample_demo.csv`):
`set_type` distinguishes warmup/normal, `weight_kg`, `reps`, `rpe`, `set_index`,
`superset_id` all present. e1RM is already computed app-wide via
`weight * (1 + reps / 30)` (`frontend/utils/analysis/core/prCalculation.ts`).

---

## 4. Design

### 4.1 Metric per exercise

For each canonical exercise, over a rolling 90-day window:

```
workingSets  = sets where !isWarmupSet && 5 <= reps <= 15 && weight_kg > 0
sessions     = group workingSets by parsedDate, take most recent N (maxSessionsForAnalysis = 5)
sessionBest  = max e1RM per session (Epley: w * (1 + reps/30))
strength     = percentile(sessionBests, 0.75)   // robust to one-off PRs
```

- Unilateral exercises (lateral raises, single-arm presses): **multiply by 2**
  so per-arm loads are comparable to bilateral totals.
- This mirrors `buildExpectedRepsRange`'s p75-of-recent approach
  (`frontend/utils/analysis/masterAlgorithm/masterAlgorithmExpectedReps.ts`).

### 4.2 Ratio registry

```ts
interface StrengthPair {
  id: string;
  a: MovementKey[];   // canonical movements mapping to A
  b: MovementKey[];   // canonical movements mapping to B
  expected: { min: number; max: number }; // A/B ratio band
  label: string;      // "Overhead Press vs Bench Press"
  confidence: 'high' | 'medium';
  copy: { watch: string; flag: string };
}
```

Movement keys are resolved from raw `exercise_title` via the existing
`createExerciseNameResolver` (each pair lists the aliases its movements
accept, e.g. OHP := ["Shoulder Press", "Shoulder Press (Dumbbell)", ...]).

### 4.3 Severity tiers

| State | Condition | Output |
|---|---|---|
| ok | ratio inside expected band | not surfaced |
| watch | ratio outside expected band, inside hard band | medium-confidence finding |
| flag | ratio outside hard band | high-confidence finding |

Up to 3 findings surface (top 2 flags + 1 guaranteed watch slot; filled with watches/flags when fewer). Findings carry `confidence` (`flag` → high, `watch` → medium) so the UI colors them honestly.

Additional suppressors:
- either exercise has < 2 sessions in window → skip pair
- fewer than 3 total sessions in the data → skip everything (compressed beginner ratios)
- rep range 5–15, warmup sets excluded, per-arm exercises doubled

### 4.4 Module layout

```
frontend/utils/analysis/strengthBalance/
  ratioRegistry.ts        // curated pairs + bands + sources (static, tested)
  strengthMetrics.ts      // rolling e1RM per canonical exercise
  strengthBalance.ts      // ratio computation + severity tiers
  strengthBalanceCopy.ts  // copy templates ("X is behind Y for most lifters...")
frontend/components/dashboard/strengthBalance/
  StrengthBalanceCard.tsx // dashboard card, mirrors InjuryRiskCard patterns
```

Computation goes through `computationCache` with the `filterCacheKey` keying
pattern, exactly like `useDashboardWeeklySetsDashboard` / `useAppDerivedData`.

---

## 5. UI surface

1. **Strength Balance card on the Dashboard** (v1):
   - list of pairs the user has data for, each with: ratio bar (actual vs
     expected band rendered as a shaded region), direction label, and
     severity chip (ok / watch / flag)
   - click-through to the Exercise view for the lagging exercise
2. **Copy pattern** (never "your form is off"):

   > "Your side raises are at ~90% of your shoulder press — most lifters sit
   > around 35–60%. Could be technique, training history, or a real imbalance.
   > Worth checking before you load up further."

3. **(Stretch) Strength profile radar** — e1RM of all your popular lifts
   relative to typical ratios, analogous to the muscle-volume radar in
   `MuscleAnalysisBodyMapPanel`. Turns "anomaly" into a browsable profile.

---

## 6. Product guardrails

- **No form claims, no injury claims.** Copy lists possible causes; links to
  the lagging exercise for inspection. Consistent with Injury Risk card's
  careful wording ("suggests", "consider").
- **Ranges, not verdicts.** Bands are wide; single-number cutoffs are rejected
  by the audience.
- **Cite honestly** — "population statistics from ~28M logged lifts" is the
  strongest honest claim we can make.
- **Never block the user** — this is informational, tiered, dismissible.

---

## 7. Open questions

1. Where should the card live — Dashboard grid (alongside InjuryRiskCard) or
   the Muscle Analysis tab? Dashboard gets the most views.
2. Pull-up pairs need bodyweight — add a bodyweight setting in v2 and extend
   the registry (pull-up/chin-up vs bench, vs row).
3. Gender-specific bands — research shows OHP:bench is ~64% for both sexes;
   keep single bands for v1.
4. Should training-level input (beginner/intermediate/advanced) widen bands?
   The app already has `TrainingLevel` in `commentaryConfig.ts`.
5. Female-specific lateral-raise tables exist on StrengthLevel (~0.15× BW vs
   0.20× BW per arm) — same caveat as #3.
