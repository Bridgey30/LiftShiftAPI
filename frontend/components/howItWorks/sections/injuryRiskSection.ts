import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const INJURY_RISK_SECTION: HowItWorksSection = {
  id: 'injury-risk',
  title: 'Injury Risk',
  sidebarTitle: 'Injury Risk',
  nodes: [
    {
      type: 'p',
      text:
        'The Injury Risk card on the dashboard estimates joint stress from 0 to 100 percent for each joint you train. Lower is safer. It is a risk hint, not a diagnosis: it combines three workload and recovery signals that research links to overuse injuries.',
    },
  ],
  children: [
    {
      id: 'injury-workload',
      title: 'Workload ratio (acute : chronic)',
      sidebarTitle: 'Workload ratio',
      nodes: [
        {
          type: 'p',
          text:
            'Compares your sets on a joint this week against your 4-week average. A sudden spike in weekly sets relative to your baseline raises the workload component of the score. This mirrors the acute:chronic workload ratio (ACWR) used in sports medicine.',
        },
      ],
    },
    {
      id: 'injury-recovery',
      title: 'Recovery (back-to-back days)',
      sidebarTitle: 'Recovery',
      nodes: [
        {
          type: 'p',
          text:
            'Tracks how many consecutive days a joint was trained. Back-to-back sessions on the same joint leave less time for tissue recovery and push the recovery component up.',
        },
      ],
    },
    {
      id: 'injury-balance',
      title: 'Antagonist balance',
      sidebarTitle: 'Balance',
      nodes: [
        {
          type: 'p',
          text:
            'Measures the volume ratio between opposing muscle groups around a joint (for example quads vs hamstrings). Large volume imbalances between an antagonist pair add to the score.',
        },
      ],
    },
    {
      id: 'injury-reading',
      title: 'Reading the score',
      sidebarTitle: 'Reading the score',
      nodes: [
        {
          type: 'p',
          text:
            'Each joint shows a segmented bar with the three factors color-coded, and hovering a joint explains what is driving its score. A spike above 40 percent suggests considering a deload or rebalancing your program. The score is a hint for load management, never medical advice.',
        },
      ],
    },
  ],
};
