import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const KEY_METRICS_SECTION: HowItWorksSection = {
  id: 'key-metrics',
  title: 'Key metrics',
  sidebarTitle: 'Key metrics',
  nodes: [
    {
      type: 'p',
      text:
        'These are the main numbers and labels you will see across the dashboard. Use them together. One metric alone can be misleading.',
    },
  ],
  children: [
    {
      id: 'metric-sets-vs-workouts',
      title: 'Sets vs workouts (sessions)',
      sidebarTitle: 'Sets vs workouts',
      nodes: [
        {
          type: 'p',
          text:
            'A "set" is one logged set. A "workout" (or session) is a full group of sets done on the same day. LiftShift uses workouts to talk about consistency, and sets to talk about training volume.',
        },
      ],
    },
    {
      id: 'metric-volume',
      title: 'Training volume',
      sidebarTitle: 'Training volume',
      nodes: [
        {
          type: 'p',
          text:
            'Volume is the "how much work did you do?" signal. LiftShift counts working sets and uses weight x reps (skipping warm-ups). Volume can be viewed per exercise, per muscle, or across your entire training history.',
        },
        {
          type: 'p',
          text:
            'Secondary exercises contribute at a configurable multiplier (default 0.5x) since indirect work produces less stimulus than primary exercises. This multiplier can be adjusted in preferences.',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Reading volume trends',
          text:
            'Rising volume usually means more training stress. Spikes can be from one unusually long session. Compare volume with consistency (how often you trained) to avoid misreading noisy weeks.',
        },
      ],
    },
    {
      id: 'metric-duration-density',
      title: 'Workout duration and density',
      sidebarTitle: 'Duration & density',
      nodes: [
        {
          type: 'p',
          text:
            'Workout duration is how long your session lasted (when source data has start/end times). Density is volume per minute. Higher density often means shorter rests or faster pacing.',
        },
      ],
    },
    {
      id: 'metric-deltas',
      title: 'Rolling window comparisons',
      sidebarTitle: 'Window comparisons',
      nodes: [
        {
          type: 'p',
          text:
            'Many dashboard cards compare a recent period to the one before it: last 7 days vs. the 7 days before, last 30 days vs. previous 30 days, last year vs. previous year. This helps you quickly answer: "Am I doing more work lately?" Deltas show as percentages with directional arrows.',
        },
      ],
    },
    {
      id: 'metric-1rm',
      title: '1RM estimate',
      sidebarTitle: '1RM estimate',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift estimates your one-rep max using the Epley formula: weight x (1 + reps/30). It is an estimate, not a max-out test. Accuracy decreases at very high rep ranges (15+). Use it to compare strength across sessions even when you change rep ranges.',
        },
      ],
    },
    {
      id: 'metric-intensity-split',
      title: 'Training focus: strength vs hypertrophy vs endurance',
      sidebarTitle: 'Training focus',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift groups your sets by rep ranges to show your training emphasis: 1-5 reps (strength-focused), 6-12 reps (hypertrophy-focused), 13+ reps (endurance-focused). This helps you see if your recent training matches your goals.',
        },
      ],
    },
    {
      id: 'metric-concentration',
      title: 'Top 3 muscle concentration',
      sidebarTitle: 'Muscle concentration',
      nodes: [
        {
          type: 'p',
          text:
            'The dashboard shows what percentage of your total weekly volume goes to your top 3 most-trained muscles. Under 55% is green (well-distributed). Over 70% is a warning that your volume is too concentrated, great for specialization phases but worth checking for balance.',
        },
      ],
    },
  ],
  cta: {
    text: 'See your own training volume, PRs, and stats:',
    links: [
      { label: 'Open LiftShift →', hrefPath: '/' },
    ],
  },
};
