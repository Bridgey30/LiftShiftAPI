import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const CALENDAR_FILTERING_SECTION: HowItWorksSection = {
  id: 'calendar-filtering',
  title: 'Calendar filtering',
  sidebarTitle: 'Calendar filtering',
  nodes: [
    {
      type: 'p',
      text:
        'Pick any date range (single day, week, month, year, or multiple custom ranges) and every chart, every metric, every insight recalculates for just that window.',
    },
  ],
  children: [
    {
      id: 'calendar-how-works',
      title: 'How it works',
      sidebarTitle: 'How it works',
      nodes: [
        {
          type: 'p',
          text:
            'The calendar filter cascades through everything. When you select a range:',
        },
        {
          type: 'ul',
          items: [
            'All workout data outside the range is hidden. Only sets within your selection are used.',
            'Every derived metric recalculates: daily summaries, exercise stats, volume trends, PRs, muscle heatmaps, streaks, deltas. Everything.',
            'The "effective now" date changes to the latest date in your filtered data, so streak calculations and time-window comparisons use the correct endpoint.',
            'The filter cache key changes, so all memoized computations refresh instantly.',
          ],
        },
      ],
    },
    {
      id: 'calendar-modes',
      title: 'Selection modes',
      sidebarTitle: 'Selection modes',
      nodes: [
        {
          type: 'p',
          text:
            'The calendar supports multiple selection modes: single day (click any date), single week (click the week number), month (click the month header), year (click the year header), or multiple custom weeks (Ctrl/Cmd-click to add/remove weeks).',
        },
      ],
    },
    {
      id: 'calendar-use-cases',
      title: 'Use cases',
      sidebarTitle: 'Use cases',
      nodes: [
        {
          type: 'ul',
          items: [
            'Compare your 2025 training against 2024 by selecting each year and observing the metrics.',
            'Isolate a specific training block (e.g., a 12-week program) and see exactly what changed.',
            'Check your recent consistency by selecting the last 30 days.',
            'Analyze a single workout week to get detailed set-by-set feedback without noise from other weeks.',
          ],
        },
      ],
    },
  ],
};
