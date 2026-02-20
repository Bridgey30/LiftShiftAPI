import { getVolumeThresholds } from './muscleParams';

// ---------------------------------------------------------------------------
// Weekly stimulus – logistic dose-response
// ---------------------------------------------------------------------------

/**
 * Estimate % of realistic possible weekly hypertrophy stimulus
 * using a tier-based model aligned with volume thresholds.
 *
 * Thresholds:
 * - <6 sets: Building stimulus (0-30%)
 * - 6-12 sets: Efficient growth (30-60%)
 * - 12-20 sets: Maximum growth (60-90%)
 * - 20-35 sets: Peak maximizing (90-98%)
 * - 35+ sets: Diminishing returns (98-100%)
 */
export function weeklyStimulus(sets: number, muscleId?: string): number {
  if (sets <= 0) return 0;
  return weeklyStimulusFromThresholds(sets, getVolumeThresholds());
}

export function weeklyStimulusFromThresholds(
  sets: number,
  thresholds: { mv: number; mev: number; mrv: number; maxv: number }
): number {
  if (sets <= 0) return 0;

  const { mv, mev, mrv, maxv } = thresholds;

  if (sets < mv) {
    return Math.round((sets / mv) * 30);
  }
  if (sets < mev) {
    return 30 + Math.round(((sets - mv) / (mev - mv)) * 30);
  }
  if (sets < mrv) {
    return 60 + Math.round(((sets - mev) / (mrv - mev)) * 30);
  }
  if (sets < maxv) {
    return 90 + Math.round(((sets - mrv) / (maxv - mrv)) * 8);
  }
  return Math.min(100, 98 + Math.round(((sets - maxv) / 10) * 2));
}
