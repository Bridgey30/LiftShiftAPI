import { getStrengthMovement } from './ratioRegistry';
import { stripExerciseSourceLabel } from '../../exercise/exerciseSourceLabel';
import type { StrengthBalancePairResult } from './strengthBalance';

export type StrengthBalanceSegment = {
  text: string;
  type: 'text' | 'exercise';
  exerciseName?: string;
};

const roundTo5 = (value: number): number => Math.round(value / 5) * 5;

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

/**
 * Shared framing: the laggard (weaker side of the user's pair) is the subject,
 * the strong lift is only ever the reference — never the problem.
 */
const getFraming = (result: StrengthBalancePairResult) => {
  const { pair, ratio } = result;

  // The laggard is the side that sits behind its typical range. Keying off
  // the expected band (not the hard band) keeps watch-tier findings framed
  // in the right direction too.
  const laggardIsA = ratio < pair.expectedMin;
  const laggardId = laggardIsA ? pair.a : pair.b;
  const strongerId = laggardIsA ? pair.b : pair.a;
  const laggardTitle = laggardIsA ? result.aExerciseTitle : result.bExerciseTitle;
  const strongerTitle = laggardIsA ? result.bExerciseTitle : result.aExerciseTitle;

  const laggardPct = laggardIsA ? ratio * 100 : (1 / ratio) * 100;
  const typicalMin = laggardIsA ? pair.expectedMin * 100 : 100 / pair.expectedMax;
  const typicalMax = laggardIsA ? pair.expectedMax * 100 : 100 / pair.expectedMin;

  return {
    laggardId,
    strongerId,
    laggardTitle,
    strongerTitle,
    laggardPct: roundTo5(laggardPct),
    typicalRange: percentRange(typicalMin, typicalMax),
  };
};

/**
 * Builds the full segmented anomaly sentence for a flagged pair. Exercise
 * names are clickable segments; the surrounding text is plain. Copy is
 * deliberately conversational and soft — possible causes are listed instead
 * of form claims. No em dashes: plain sentences only.
 */
export const buildStrengthBalanceAnomalySegments = (
  result: StrengthBalancePairResult
): StrengthBalanceSegment[] | null => {
  if (result.severity !== 'flag') return null;

  const f = getFraming(result);

  return [
    { text: 'Heads up: your ', type: 'text' },
    titleSegment(f.laggardTitle, movementLabel(f.laggardId)),
    { text: ` is at about ${f.laggardPct}% of your `, type: 'text' },
    titleSegment(f.strongerTitle, movementLabel(f.strongerId)),
    {
      text: `. Most lifters sit around ${f.typicalRange} of their ${movementLabel(f.strongerId)}. Could be technique, programming, or a real imbalance worth checking.`,
      type: 'text',
    },
  ];
};

/**
 * Compact one-liner for lower-priority findings (watch tier). Same framing,
 * no "Heads up" opener and no tail.
 */
export const buildStrengthBalanceCompactSegments = (
  result: StrengthBalancePairResult
): StrengthBalanceSegment[] | null => {
  if (result.severity === 'ok') return null;

  const f = getFraming(result);

  return [
    { text: 'Your ', type: 'text' },
    titleSegment(f.laggardTitle, movementLabel(f.laggardId)),
    { text: ` is at about ${f.laggardPct}% of your `, type: 'text' },
    titleSegment(f.strongerTitle, movementLabel(f.strongerId)),
    {
      text: `. Most lifters sit around ${f.typicalRange} of their ${movementLabel(f.strongerId)}.`,
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

const PLURAL_MOVEMENT_LABELS = new Set([
  'side raises',
  'rows',
  'leg curls',
  'leg extensions',
  'curls',
  'triceps pushdowns',
  'skullcrushers',
]);

const isPluralLabel = (label: string): boolean => PLURAL_MOVEMENT_LABELS.has(label);

/**
 * Synthesizes a one-line TL;DR from the top findings, framed around muscle
 * groups (e.g. "Your chest is behind your back and shoulders."). Same-group
 * pairs (curls vs pushdowns) fall back to movement labels. Returns null with
 * fewer than 2 findings — a single finding is already the summary.
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
      const verb = isPluralLabel(laggard.label) ? 'are' : 'is';
      entry.sameGroup.push(`Your ${laggard.label} ${verb} lagging behind your ${stronger.label}.`);
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
