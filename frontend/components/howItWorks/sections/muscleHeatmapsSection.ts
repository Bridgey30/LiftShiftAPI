import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const MUSCLE_HEATMAPS_SECTION: HowItWorksSection = {
  id: 'muscle-heatmaps',
  title: 'Muscle heatmaps',
  sidebarTitle: 'Muscle heatmaps',
  nodes: [
    {
      type: 'p',
      text:
        'The muscle heatmap shows which muscle groups you\'re training, and how much. It turns raw exercise logs into a visual answer to questions like "Am I training back as much as chest?" and "Which muscles am I neglecting?"',
    },
  ],
  children: [
    {
      id: 'heatmap-how-mapping-works',
      title: 'How exercises are mapped to muscles',
      sidebarTitle: 'Exercise → muscle mapping',
      nodes: [
        {
          type: 'p',
          text:
            'Every logged exercise is matched to a known exercise in LiftShift\'s database. Each exercise has defined primary muscle(s) and secondary muscle(s). Primary muscles count at 1.0x, secondary at a configurable multiplier (default 0.5x).',
        },
        {
          type: 'p',
          text:
            'For example, a bench press primarily targets the chest and triceps (at 1.0x each), and secondarily targets the front shoulders (at 0.5x).',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Exercise naming matters',
          text:
            'If your exercise name doesn\'t match any known exercise, it won\'t appear on the heatmap. LiftShift uses fuzzy matching to catch variations, but very unusual names may need to be re-imported with standardized names.',
        },
      ],
    },
    {
      id: 'heatmap-interactive',
      title: 'Interactive body map',
      sidebarTitle: 'Interactive body map',
      nodes: [
        {
          type: 'p',
          text:
            'The body map is fully interactive. Hover any muscle to see your weekly set rate, volume zone, and estimated progress percentage. Click any muscle to drill into a detailed view showing exactly which exercises contribute to that muscle, with primary and secondary sets broken out separately.',
        },
        {
          type: 'p',
          text:
            'The body map supports both male and female silhouettes, and two view modes: group view (broad regions like Chest, Back, Arms) and muscle view (detailed individual muscles like upper chest, lats, biceps).',
        },
      ],
    },
    {
      id: 'heatmap-rolling-windows',
      title: 'Rolling 7-day windows',
      sidebarTitle: 'Rolling 7-day windows',
      nodes: [
        {
          type: 'p',
          text:
            'Weekly volume is calculated using rolling 7-day windows, not calendar weeks. This matches how your body actually recovers and adapts. Starting on any given day, it sums the last 7 days of volume per muscle, giving you a realistic picture of current training stress.',
        },
        {
          type: 'p',
          text:
            'You can switch between time windows: last 7 days, last 30 days, last 365 days, or all-time data. Longer windows show long-term patterns; shorter windows show what\'s happening right now.',
        },
      ],
    },
    {
      id: 'heatmap-volume-zones',
      title: 'Volume zones (MEV, MRV)',
      sidebarTitle: 'Volume zones',
      nodes: [
        {
          type: 'p',
          text:
            'Each muscle\'s weekly volume is classified into one of five zones, using thresholds personalized to your training age:',
        },
        {
          type: 'ul',
          items: [
            'Activating (< MV): Below maintenance. Minimal gains. Fine for low-priority muscles only.',
            'Stimulating (MV–MEV): Steady progress zone. Default for most muscles.',
            'Amplifying (MEV–MRV): Best ROI. Sweet spot for muscles you care about.',
            'Maximizing (MRV–MaxV): High gains, high cost. Specialize 1-2 muscles at this level.',
            'Overreaching (> MaxV): Peak week only. Poor ROI, recovery suffers.',
          ],
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Thresholds by training age',
          text:
            'Volume thresholds scale with experience: beginners have lower MEV/MRV, advanced lifters need more volume. Your training age is determined automatically from your data (months of training history).',
        },
      ],
    },
    {
      id: 'heatmap-hypertrophy',
      title: 'Hypertrophy scoring',
      sidebarTitle: 'Hypertrophy score',
      nodes: [
        {
          type: 'p',
          text:
            'Each muscle gets a 0-100 hypertrophy score based on three factors: volume (50% weight, how close you are to optimal weekly sets), progressive overload (40%, your 1RM trend), and frequency (10%, how many days per week you train that muscle).',
        },
        {
          type: 'p',
          text:
            'The score is visible when hovering any muscle on the body map. Green (60+) means you\'re in a good growth zone. Amber (40-59) means you could optimize. Red (< 40) means the muscle likely isn\'t getting enough stimulus.',
        },
      ],
    },
    {
      id: 'heatmap-muscle-balance',
      title: 'Muscle balance analysis',
      sidebarTitle: 'Muscle balance',
      nodes: [
        {
          type: 'p',
          text:
            'The dashboard tracks how concentrated your volume is across muscles. If your top 3 muscles get over 70% of your total volume, LiftShift flags it. You also get a radar chart view showing relative emphasis across all muscle groups in a single polar graph.',
        },
      ],
    },
  ],
};
