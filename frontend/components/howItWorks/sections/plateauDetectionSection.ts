import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const PLATEAU_DETECTION_SECTION: HowItWorksSection = {
  id: 'plateau-detection',
  title: 'Plateau detection',
  sidebarTitle: 'Plateau detection',
  nodes: [
    {
      type: 'p',
      text:
        'LiftShift doesn\'t just tell you you\'re stuck. It tells you exactly what to try next. Plateau detection compares your recent sessions to previous ones and categorizes the stall, then generates a specific, actionable suggestion.',
    },
  ],
  children: [
    {
      id: 'plateau-how-works',
      title: 'How detection works',
      sidebarTitle: 'How it works',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift analyzes each exercise\'s trend using a windowed comparison. A recent window of sessions is compared to the immediately preceding window. If the directional strength change is between -3% and +1%, the exercise is flagged as plateauing.',
        },
        {
          type: 'p',
          text:
            'The dashboard surface aggregates all plateaued exercises and ranks them by how long they\'ve been stuck. Exercises with fewer than 2 sessions or no activity in the last 45 days are excluded.',
        },
      ],
    },
    {
      id: 'plateau-static-vs-general',
      title: 'Static vs general plateaus',
      sidebarTitle: 'Static vs general',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift distinguishes between two types of plateaus:',
        },
        {
          type: 'ul',
          items: [
            'Static plateau: Both weight AND reps are frozen across multiple sessions (within 0.5 kg and 1 rep). This is a true stall. Your comfort zone is showing. Suggestions are more aggressive.',
            'General plateau: The trend is flat but weight or reps are still varying. You\'re not necessarily stuck. You may just need a small nudge.',
          ],
        },
      ],
    },
    {
      id: 'plateau-suggestions',
      title: 'Suggestions you can actually use',
      sidebarTitle: 'Suggestions',
      nodes: [
        {
          type: 'p',
          text:
            'For static plateaus, LiftShift calculates a suggested next weight (current weight + one standard increment) and gives concrete advice like:',
        },
        {
          type: 'ul',
          items: [
            '"Double progression: repeat 80 kg, add 1-2 reps across sets, then increase weight."',
            '"Try 82.5 kg next session, or repeat 80 kg and add a rep if form breaks."',
            '"Master 8 reps across all sets, then level up."',
            '"Get fancy: pause reps, slow eccentrics (3-4 seconds), or slightly shorter rests."',
          ],
        },
        {
          type: 'p',
          text:
            'For general plateaus, suggestions are simpler: "Pick one lever: +1 rep somewhere, or a small load bump next session."',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Muscle-specific advice',
          text:
            'The suggestion adapts based on exercise type. Bodyweight exercises get rep-focused suggestions. Weighted exercises get load-focused suggestions. Assisted exercises get reduction-based suggestions.',
        },
      ],
    },
  ],
};
