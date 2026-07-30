import React from 'react';

import { Flame } from 'lucide-react';

import type { StreakInfo } from '../../utils/analysis/insights';

// Streak Badge Component
export const StreakBadge: React.FC<{ streak: StreakInfo }> = ({ streak }) => {
  const { currentStreak, streakType, isOnStreak } = streak;

  if (!isOnStreak && currentStreak === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-slate-500">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
        <span className="text-[10px] font-medium">Start a streak</span>
      </div>
    );
  }

  const config = {
    hot: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    warm: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    cold: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  };

  const { color, bg } = config[streakType];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${bg}`}>
      <Flame className={`w-3 h-3 ${color} flex-shrink-0`} />
      <span className={`text-[10px] font-semibold ${color} whitespace-nowrap`}>{currentStreak}wk streak</span>
    </div>
  );
};
