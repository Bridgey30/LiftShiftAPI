import { getStrengthMovement, type MovementId } from './ratioRegistry';
import { stripExerciseSourceLabel } from '../../exercise/exerciseSourceLabel';
import { BAND_EPS, type StrengthBalancePairResult } from './strengthBalance';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StrengthBalanceSegment = {
  text: string;
  type: 'text' | 'exercise';
  exerciseName?: string;
};

const roundTo5 = (value: number): number => Math.round(value / 5) * 5;

/**
 * 3-point centered moving average used by the dashboard chart and the trend
 * chip alike, so the chip's numbers are always values visible on the graph.
 * Edges keep their value.
 */
export const smoothSeries = (values: number[]): number[] => {
  if (values.length < 3) return values;
  return values.map((v, i) => {
    const prev = values[i - 1] ?? v;
    const next = values[i + 1] ?? v;
    return (prev + v + next) / 3;
  });
};

const movementLabel = (movementId: string): string => {
  return getStrengthMovement(movementId)?.label ?? movementId.replace(/_/g, ' ');
};

const percentRange = (a: number, b: number): string =>
  `${roundTo5(Math.min(a, b))}–${roundTo5(Math.max(a, b))}%`;

const titleSegment = (title: string, fallback: string): StrengthBalanceSegment => ({
  text: title ? stripExerciseSourceLabel(title) : fallback,
  type: 'exercise',
  exerciseName: title || undefined,
});

export interface StrengthBalanceFraming {
  laggardId: MovementId;
  strongerId: MovementId;
  laggardTitle: string;
  strongerTitle: string;
  laggardIsA: boolean;
  /** Exact (unrounded) laggard % of the stronger lift — for charts. */
  laggardPctRaw: number;
  /** Copy-rounded (to 5) laggard % of the stronger lift. */
  laggardPct: number;
  /** Exact expected band in laggard-% units. */
  typicalMin: number;
  typicalMax: number;
  typicalRange: string;
}

/**
 * Shared framing: the laggard (weaker side of the user's pair) is the subject,
 * the strong lift is only ever the reference — never the problem. All values
 * are in "laggard as % of stronger" units so copy and charts stay consistent.
 *
 * For `ok` pairs (ratio inside the band) neither side is really lagging, so
 * the framing switches to the strictly weaker side (ratio < 1) — that's what
 * the positive "in the typical range" copy and its chart use.
 */
export const getFraming = (result: StrengthBalancePairResult): StrengthBalanceFraming => {
  const { pair, ratio } = result;

  // The laggard is the side that sits behind its typical range. Keying off
  // the expected band (not the hard band) keeps watch-tier findings framed
  // in the right direction too. BAND_EPS keeps exact boundary ratios
  // (e.g. 0.95 from round weights) from flipping sides on float noise.
  const boundary = result.severity === 'ok' ? 1 : pair.expectedMin;
  const laggardIsA = ratio < boundary - BAND_EPS;
  const laggardId = laggardIsA ? pair.a : pair.b;
  const strongerId = laggardIsA ? pair.b : pair.a;
  const laggardTitle = laggardIsA ? result.aExerciseTitle : result.bExerciseTitle;
  const strongerTitle = laggardIsA ? result.bExerciseTitle : result.aExerciseTitle;

  const laggardPctRaw = laggardIsA ? ratio * 100 : (1 / ratio) * 100;
  const typicalMin = laggardIsA ? pair.expectedMin * 100 : 100 / pair.expectedMax;
  const typicalMax = laggardIsA ? pair.expectedMax * 100 : 100 / pair.expectedMin;

  // Display rule: round the current % to the nearest 5% as usual, but never
  // let a value that is actually OUTSIDE the band round onto the band edge —
  // an 84.8% reading as "about 85%" next to an "85–95%" band looks in-range
  // when it isn't. Such borderline values keep one decimal ("84.8%") so the
  // sentence and the band can't collide.
  const belowLow = laggardPctRaw < typicalMin - BAND_EPS;
  const aboveHigh = laggardPctRaw > typicalMax + BAND_EPS;
  const roundsOntoEdge =
    (belowLow && roundTo5(laggardPctRaw) >= roundTo5(typicalMin)) ||
    (aboveHigh && roundTo5(laggardPctRaw) <= roundTo5(typicalMax));
  const laggardPct = roundsOntoEdge
    ? Math.round(laggardPctRaw * 10) / 10
    : roundTo5(laggardPctRaw);

  return {
    laggardId,
    strongerId,
    laggardTitle,
    strongerTitle,
    laggardIsA,
    laggardPctRaw,
    laggardPct,
    typicalMin,
    typicalMax,
    typicalRange: percentRange(typicalMin, typicalMax),
  };
};

/**
 * Weekly series for charts, oldest → newest, always in the sentence's units:
 * the laggard as a % of the stronger lift (ratio*100 when the laggard is the
 * A side, 100/ratio otherwise). Keeping one unit everywhere means the trend
 * verdict and the chart line can never contradict the sentence. Weeks where
 * the ratio sat on the opposite side plot above the band — the chart's
 * stable y-axis clips those at the top edge instead of stretching.
 */
export const getLaggardPctSeries = (result: StrengthBalancePairResult): number[] => {
  const f = getFraming(result);
  return result.history.map((h) => (f.laggardIsA ? h.ratio * 100 : 100 / h.ratio));
};

/**
 * Builds the full segmented anomaly sentence for a flagged pair. Exercise
 * names are clickable segments; the surrounding text is plain. Copy is
 * deliberately conversational and soft. "of the strength of" makes the unit
 * explicit: the percentage compares estimated 1-rep-max strength, not
 * volume or frequency. No em dashes: plain sentences only.
 */
export const buildStrengthBalanceAnomalySegments = (
  result: StrengthBalancePairResult
): StrengthBalanceSegment[] | null => {
  if (result.severity !== 'flag') return null;

  const f = getFraming(result);

  return [
    { text: 'Your ', type: 'text' },
    titleSegment(f.laggardTitle, movementLabel(f.laggardId)),
    { text: ` is at about ${f.laggardPct}% of the strength of your `, type: 'text' },
    titleSegment(f.strongerTitle, movementLabel(f.strongerId)),
    {
      text: `. Most lifters sit around ${f.typicalRange} of their ${movementLabel(f.strongerId)}.`,
      type: 'text',
    },
  ];
};

/**
 * Compact one-liner for lower-priority findings (watch tier). Same framing,
 * no opener and no tail.
 */
export const buildStrengthBalanceCompactSegments = (
  result: StrengthBalancePairResult
): StrengthBalanceSegment[] | null => {
  if (result.severity === 'ok') return null;

  const f = getFraming(result);

  return [
    { text: 'Your ', type: 'text' },
    titleSegment(f.laggardTitle, movementLabel(f.laggardId)),
    { text: ` is at about ${f.laggardPct}% of the strength of your `, type: 'text' },
    titleSegment(f.strongerTitle, movementLabel(f.strongerId)),
    {
      text: `. Most lifters sit around ${f.typicalRange} of their ${movementLabel(f.strongerId)}.`,
      type: 'text',
    },
  ];
};

/**
 * Positive one-liner for pairs inside the typical band: same framing and
 * units as the finding copy, with a reassurance tail. Used by the "all
 * comparisons" view so in-range pairs read as good news, not silence.
 */
export const buildStrengthBalanceOkSegments = (
  result: StrengthBalancePairResult
): StrengthBalanceSegment[] | null => {
  if (result.severity !== 'ok') return null;

  const f = getFraming(result);

  return [
    { text: 'Your ', type: 'text' },
    titleSegment(f.laggardTitle, movementLabel(f.laggardId)),
    { text: ` is at about ${f.laggardPct}% of the strength of your `, type: 'text' },
    titleSegment(f.strongerTitle, movementLabel(f.strongerId)),
    {
      text: `. Most lifters sit around ${f.typicalRange} of their ${movementLabel(f.strongerId)}. You're right in the typical range.`,
      type: 'text',
    },
  ];
};

export const buildStrengthBalanceAnomalyText = (
  result: StrengthBalancePairResult
): string | null => {
  const segments = buildStrengthBalanceAnomalySegments(result);
  return segments ? segments.map((s) => s.text).join('') : null;
};

const joinList = (items: string[]): string =>
  items.length === 1
    ? items[0]
    : items.length === 2
      ? `${items[0]} and ${items[1]}`
      : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Muscle-level phrase for each movement, used when a pair sits entirely
 * inside one muscle group so the TL;DR stays muscle-focused ("your triceps
 * are lagging behind your biceps") instead of naming exercises twice.
 */
const MOVEMENT_MUSCLE_PHRASE: Partial<Record<MovementId, string>> = {
  bench: 'chest',
  incline_bench: 'upper chest',
  overhead_press: 'front delts',
  lateral_raise: 'side delts',
  squat: 'quads',
  front_squat: 'quads',
  deadlift: 'posterior chain',
  romanian_deadlift: 'hamstrings',
  row: 'mid-back',
  pulldown: 'lats',
  leg_curl: 'hamstrings',
  leg_extension: 'quads',
  curl: 'biceps',
  pushdown: 'triceps',
  skullcrusher: 'triceps',
};

const isPluralMusclePhrase = (phrase: string): boolean => phrase.endsWith('s');

/**
 * Synthesizes a one-line TL;DR from the top findings, framed around muscle
 * groups (e.g. "Your chest is behind your back and shoulders."). Same-group
 * pairs (curls vs pushdowns) are framed around the specific muscles they
 * target, and skipped when both sides map to the same muscle. Returns null
 * with fewer than 2 findings — a single finding is already the summary.
 */
export const buildStrengthBalanceTldr = (
  findings: StrengthBalancePairResult[]
): string | null => {
  if (findings.length < 2) return null;

  type GroupEntry = { count: number; strongerGroups: Set<string>; sameGroup: string[] };
  const byGroup = new Map<string, GroupEntry>();

  for (const finding of findings) {
    const f = getFraming(finding);
    const laggard = getStrengthMovement(f.laggardId);
    const stronger = getStrengthMovement(f.strongerId);
    if (!laggard || !stronger) continue;

    let entry = byGroup.get(laggard.muscleGroup);
    if (!entry) {
      entry = { count: 0, strongerGroups: new Set(), sameGroup: [] };
      byGroup.set(laggard.muscleGroup, entry);
    }
    entry.count += 1;
    if (stronger.muscleGroup === laggard.muscleGroup) {
      const laggardPhrase = MOVEMENT_MUSCLE_PHRASE[f.laggardId];
      const strongerPhrase = MOVEMENT_MUSCLE_PHRASE[f.strongerId];
      if (laggardPhrase && strongerPhrase && laggardPhrase !== strongerPhrase) {
        const verb = isPluralMusclePhrase(laggardPhrase) ? 'are' : 'is';
        entry.sameGroup.push(`Your ${laggardPhrase} ${verb} lagging behind your ${strongerPhrase}.`);
      }
    } else {
      entry.strongerGroups.add(stronger.muscleGroup);
    }
  }

  const groups = Array.from(byGroup.entries())
    .filter(([, entry]) => entry.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  const clauses: string[] = [];
  for (const [group, entry] of groups.slice(0, 2)) {
    if (entry.strongerGroups.size > 0) {
      const verb = group.endsWith('s') ? 'are' : 'is';
      clauses.push(`Your ${group} ${verb} likely lagging behind your ${joinList(Array.from(entry.strongerGroups))}.`);
    }
    clauses.push(...entry.sameGroup.slice(0, 1));
  }

  return clauses.length > 0 ? clauses.slice(0, 2).join(' ') : null;
};

export type RatioTrend = 'closing' | 'widening' | 'steady';

interface TrendAnalysis {
  trend: RatioTrend;
  /** Actual first point of the chart series in the recent window (copy-rounded). */
  startPct: number;
  /** Actual last point — the current "now" value (copy-rounded). */
  endPct: number;
  months: number;
}

/**
 * Trend of the laggard-% series measured over the RECENT window only — the
 * last ~5 weeks plus the current value (min 2 points). It runs on the exact
 * same series the dashboard chart plots: 3-week smoothed weekly points with
 * the raw current value appended as the "now" point, so every number the
 * chip shows is a value visible on the graph. The direction verdict comes
 * from a least-squares fit over those points (a single weird week can't
 * swing it, and the smoothed series keeps the fit from chasing noise).
 * "Closing" means the fitted line moves toward the expected band midpoint;
 * "widening" means away. This answers "how has it been doing lately", not
 * "what happened 3 months ago".
 */
const analyzeTrend = (result: StrengthBalancePairResult): TrendAnalysis | null => {
  const f = getFraming(result);
  const rawSeries = getLaggardPctSeries(result);
  const { history } = result;
  if (rawSeries.length < 2) return null;

  // Chart series, in the same order the chart renders it: smoothed weekly
  // points, then the raw current value as the final "now" point. "now" gets
  // an x one week after the newest logged week so the fit can use it.
  const chartSeries = [...smoothSeries(rawSeries), f.laggardPctRaw];
  const lastWeek = history[history.length - 1].weekStart;
  const nowX = lastWeek + 7 * DAY_MS;

  // Recent window: points within the last 5 weeks of the newest one. The
  // "now" point always belongs to it; with sparse logging the window can
  // shrink to just the newest week + "now", which is still a fit.
  const windowCutoff = lastWeek - 5 * 7 * DAY_MS;
  const pts = history
    .map((h, i) => ({ x: h.weekStart, y: chartSeries[i] }))
    .filter((p) => p.x >= windowCutoff);
  pts.push({ x: nowX, y: f.laggardPctRaw });

  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const sxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const slope = sxx > 0 ? sxy / sxx : 0;
  const fittedStart = my + slope * (pts[0].x - mx);
  const fittedEnd = my + slope * (pts[pts.length - 1].x - mx);

  let trend: RatioTrend = 'steady';
  const startPct = roundTo5(pts[0].y);
  const endPct = roundTo5(pts[pts.length - 1].y);
  // A chip with equal displayed values ("50% → 50%") would contradict its
  // own direction label, so require movement in both the displayed points
  // and the fitted line before calling a trend.
  if (startPct !== endPct && roundTo5(fittedStart) !== roundTo5(fittedEnd)) {
    const mid = (f.typicalMin + f.typicalMax) / 2;
    const startDist = Math.abs(fittedStart - mid);
    const endDist = Math.abs(fittedEnd - mid);
    trend = endDist < startDist ? 'closing' : 'widening';
  }

  const spanDays = (pts[pts.length - 1].x - pts[0].x) / DAY_MS;
  return {
    trend,
    startPct,
    endPct,
    months: Math.max(1, Math.round(spanDays / 30)),
  };
};

/**
 * Direction of change of the laggard-% series over the recent window,
 * measured as movement toward (or away from) the expected band midpoint.
 * Requires at least 2 weekly points.
 */
export const getRatioTrend = (result: StrengthBalancePairResult): RatioTrend =>
  analyzeTrend(result)?.trend ?? 'steady';

/**
 * One-line chip for the dashboard card, in the same units as the sentence:
 * "Gap closing · 50% → 60% over 3 months". The values are the first and
 * last points of the chart series in the recent window (smoothed weekly +
 * current "now" value), so they always appear on the graph, and the span is
 * reported in months. Null when the trend is steady or there isn't enough
 * history.
 */
export const buildTrendChip = (result: StrengthBalancePairResult): string | null => {
  const analysis = analyzeTrend(result);
  if (!analysis || analysis.trend === 'steady') return null;
  const { trend, startPct, endPct, months } = analysis;
  return `${trend === 'closing' ? 'Gap closing' : 'Gap widening'} · ${startPct}% → ${endPct}% over ${months} ${months === 1 ? 'month' : 'months'}`;
};

/**
 * Honest sourcing note for the card footer. Severity (flag/watch) says how
 * far outside the band the user is; this says how strong the band itself is.
 */
export const buildResearchConfidenceNote = (researchConfidence: 'high' | 'medium'): string =>
  researchConfidence === 'high'
    ? 'Based on ~28M logged lifts'
    : 'Less research — treat as a hint';

/**
 * Short name for a finding, used as the segment-control label: "Chest vs
 * Mid-back", "Triceps vs Biceps". Muscle phrases where possible; movement
 * labels when both sides map to the same muscle (skullcrusher vs pushdown).
 */
export const getFindingLabel = (result: StrengthBalancePairResult): string => {
  const f = getFraming(result);
  const laggardPhrase = MOVEMENT_MUSCLE_PHRASE[f.laggardId];
  const strongerPhrase = MOVEMENT_MUSCLE_PHRASE[f.strongerId];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (laggardPhrase && strongerPhrase && laggardPhrase !== strongerPhrase) {
    return `${cap(laggardPhrase)} vs ${cap(strongerPhrase)}`;
  }
  return `${cap(movementLabel(f.laggardId))} vs ${cap(movementLabel(f.strongerId))}`;
};
