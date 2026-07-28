import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const ACTIVITY_CONSISTENCY_SECTION: HowItWorksSection = {
  id: 'activity-consistency',
  title: 'Activity & consistency',
  sidebarTitle: 'Activity & consistency',
  nodes: [
    {
      type: 'p',
      text:
        'LiftShift tracks your training frequency and consistency to give you a clear picture of your habits.',
    },
  ],
  children: [
    {
      id: 'activity-heatmap',
      title: 'GitHub-style consistency heatmap',
      sidebarTitle: 'Consistency heatmap',
      nodes: [
        {
          type: 'p',
          text:
            'The activity heatmap shows your entire year\'s training at a glance, with each day shown as a colored square. Darker green = more volume that day. The two most recent months show larger cells with workout date numbers or a dumbbell icon. Today gets a blue ring highlight. Your peak volume day gets an amber ring.',
        },
        {
          type: 'p',
          text:
            'A consistency score (0-100%) is computed from your weekly training frequency. An 8-week trend sparkline shows whether your consistency is improving (green), declining (red), or stable (blue).',
        },
      ],
    },
    {
      id: 'activity-streaks',
      title: 'Streaks',
      sidebarTitle: 'Streaks',
      nodes: [
        {
          type: 'p',
          text:
            'Consistency is tracked week-by-week. A streak is the number of consecutive weeks with at least one workout. The dashboard shows your current streak, your longest streak ever, and your average workouts per week.',
        },
      ],
    },
  ],
};
