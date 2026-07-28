import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const DATA_NORMALIZATION_SECTION: HowItWorksSection = {
  id: 'data-normalization',
  title: 'Data normalization',
  sidebarTitle: 'Data normalization',
  nodes: [
    {
      type: 'p',
      text:
        'After import, LiftShift cleans and standardizes your workouts so every chart is consistent, even if data came from different apps.',
    },
    {
      type: 'ul',
      items: [
        'Dates are parsed into real timestamps so filtering and time-series charts work reliably.',
        'Weights are converted into a single internal unit (kg) and displayed back as kg or lbs based on your preference.',
        'Sets are grouped into workouts (sessions) by date + time proximity so totals match what you did in the gym.',
        'Exercise names from different apps are fuzzy-matched to a canonical name (e.g. "BB Bench" → "Bench Press").',
        'Warm-up sets (labeled "w" or "warmup") are excluded from most analytics so trends reflect working sets only.',
      ],
    },
    {
      type: 'callout',
      tone: 'note',
      title: 'What counts as a warm-up?',
      text:
        'A set is treated as warm-up when its set type is "w" or contains "warmup". Warm-ups are preserved in the history view but excluded from volume totals, PRs, and trend calculations.',
    },
  ],
};
