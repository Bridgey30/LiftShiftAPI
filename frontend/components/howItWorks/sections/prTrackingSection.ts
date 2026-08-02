import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const PR_TRACKING_SECTION: HowItWorksSection = {
  id: 'personal-records',
  title: 'Personal records (PRs)',
  sidebarTitle: 'PR tracking',
  nodes: [
    {
      type: 'p',
      text:
        'A PR in LiftShift means a new best for an exercise based on your logged sets. LiftShift tracks seven kinds of PRs and several PR-related signals.',
    },
    {
      type: 'callout',
      tone: 'note',
      title: 'What a PR does (and doesn\'t) mean',
      text:
        'A PR is a good progress signal, but it doesn\'t automatically mean your program is perfect, and not hitting PRs every week doesn\'t mean you\'re failing. Use PRs alongside volume, consistency, and trends.',
    },
  ],
  children: [
    {
      id: 'pr-gold',
      title: 'Gold PRs (all-time bests)',
      sidebarTitle: 'Gold PRs',
      nodes: [
        {
          type: 'p',
          text:
            'A Gold PR is a true all-time best. LiftShift tracks several types per exercise: weight PR (heaviest weight lifted in a single set), 1RM PR (highest estimated one-rep max using the Epley formula), set volume PR (highest weight x reps in a single set), rep PR (most reps in a single set), weighted rep PR (most reps at a specific weight), session volume PR (most total tonnage in one workout), and distance PR (most distance in one cardio session).',
        },
        {
          type: 'p',
          text:
            'For assisted exercises (where lower weight is better), the comparison logic is inverted. Less assistance is better.',
        },
      ],
    },
    {
      id: 'pr-silver',
      title: 'Silver PRs (1-month bests)',
      sidebarTitle: 'Silver PRs',
      nodes: [
        {
          type: 'p',
          text:
            'Experienced lifters rarely hit true all-time PRs. Silver PRs track your best performance in the last 30 days. If you haven\'t hit a Gold PR recently, a Silver PR still shows you\'re making progress. Useful for tracking momentum during training blocks.',
        },
      ],
    },
    {
      id: 'pr-premature',
      title: 'Premature PRs',
      sidebarTitle: 'Premature PRs',
      nodes: [
        {
          type: 'p',
          text:
            'A premature PR is a big jump that you couldn\'t sustain. LiftShift detects this when a PR spike (> 2% improvement for weighted, > +1 rep for bodyweight) is followed by sessions that consistently fall short of that new benchmark.',
        },
        {
          type: 'p',
          text:
            'If you later re-hit the PR level in two or more sessions, the premature flag is removed and the PR is validated. This prevents false positives and ensures the label only appears when the jump was genuinely unsustainable.',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Not a failure label',
          text:
            'A premature PR is not a "you failed" label. It\'s a reminder to build strength in a stable way: repeat the weight, improve reps and form, make smaller jumps.',
        },
      ],
    },
    {
      id: 'pr-drought',
      title: 'PR droughts',
      sidebarTitle: 'PR droughts',
      nodes: [
        {
          type: 'p',
          text:
            'A PR drought means you haven\'t hit a new all-time best in over 14 days. This is normal during phases focused on form, higher reps, or rebuilding after a break. The dashboard shows the drought duration and suggests chasing a small rep or load win instead of grinding for a max.',
        },
      ],
    },
    {
      id: 'pr-frequency',
      title: 'PR frequency',
      sidebarTitle: 'PR frequency',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift calculates how many Gold PRs you hit per week (on average) over the last 30 days. This gives you a quick "PR momentum" read on the dashboard. ~0.5/week means you hit a PR every 2 weeks. ~2/week means you\'re on a roll.',
        },
      ],
    },
  ],
};
