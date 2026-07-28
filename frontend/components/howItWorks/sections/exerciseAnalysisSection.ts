import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const EXERCISE_ANALYSIS_SECTION: HowItWorksSection = {
  id: 'exercise-analysis',
  title: 'Exercise analysis',
  sidebarTitle: 'Exercise analysis',
  nodes: [
    {
      type: 'p',
      text:
        'Pick any exercise and LiftShift gives you a complete picture: strength trends, status labels, evidence badges, progress charts, and personalized commentary.',
    },
  ],
  children: [
    {
      id: 'exercise-status-labels',
      title: 'Exercise status labels',
      sidebarTitle: 'Status labels',
      nodes: [
        {
          type: 'p',
          text:
            'Every exercise gets a clear status based on its recent trend. LiftShift compares a recent window of sessions to the previous window and computes a directional strength change:',
        },
        {
          type: 'ul',
          items: [
            'Getting stronger (> +1%): clear positive change. Trend is up.',
            'Plateauing (between -3% and +1%): roughly stable. Time for a small push.',
            'Taking a dip (< -3%): clear drop. Fatigue, deload, or life stress showing.',
            'New: not enough sessions yet to read a trend (fewer than 2 sessions).',
          ],
        },
        {
          type: 'p',
          text:
            'Each status comes with a confidence level based on session count: high (10+ sessions), medium (6+), or low (< 6). More sessions = more reliable status.',
        },
        {
          type: 'p',
          text:
            'For assisted exercises where lower weight is better (e.g., assisted pull-ups), the labels invert: "easier loading" means you need less assistance, "harder loading" means you needed more.',
        },
      ],
    },
    {
      id: 'exercise-trend-smoothing',
      title: 'Trend smoothing',
      sidebarTitle: 'Trend smoothing',
      nodes: [
        {
          type: 'p',
          text:
            'Training data is noisy. One great day doesn\'t mean you\'re progressing, and one bad day doesn\'t mean you\'re regressing. LiftShift can smooth trend lines using an exponential moving average so you see the bigger picture.',
        },
        {
          type: 'p',
          text:
            'You can toggle between "stable" mode (smoothed, less reactive to single sessions) and "reactive" mode (raw session-to-session, catches changes faster) in preferences.',
        },
      ],
    },
    {
      id: 'exercise-evidence',
      title: 'Evidence badges',
      sidebarTitle: 'Evidence badges',
      nodes: [
        {
          type: 'p',
          text:
            'Each exercise shows evidence badges with the exact percentage change that produced its status label. Hover a badge to see the window size, session count, and trend direction. Recent evidence tags include: accelerating, steady progress, easing, still improving, rebound, slipping, improving, worsening.',
        },
      ],
    },
    {
      id: 'exercise-deep-dive',
      title: 'Exercise detail view',
      sidebarTitle: 'Detail view',
      nodes: [
        {
          type: 'p',
          text:
            'Click any exercise to open the detail view, which shows:',
        },
        {
          type: 'ul',
          items: [
            'Strength progression chart with 1RM estimate trend line.',
            'Status card with evidence badges and a suggestion panel telling you what to do next session.',
            'Exercise stats: total sets, total volume, average reps, best weight, session count.',
            'Recent history table showing each session\'s sets, reps, and weight.',
            'Muscle involvement badge showing which muscles this exercise trains.',
          ],
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Calendar filter works here too',
          text:
            'The exercise detail view respects your active calendar filter. If you select a specific date range, the exercise analysis recalculates for only those sessions. Compare your bench press in 2024 vs 2025 by changing the range.',
        },
      ],
    },
  ],
};
