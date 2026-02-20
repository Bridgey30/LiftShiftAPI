import { useMemo, useState, useEffect } from 'react';
import type { Session } from '../utils/historySessions';
import {
  ITEMS_PER_PAGE,
  formatWorkoutDuration,
  getDateKey,
  getSessionDurationMs,
} from '../utils/historyViewConstants';

export interface useHistorySessionReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentSessions: Session[];
  totalPages: number;
  collapsedSessions: Set<string>;
  toggleSessionCollapse: (key: string) => void;
  sessionKeys: string[];
}

export const useHistorySession = (
  sessions: Session[],
  targetDate: Date | null | undefined,
  onTargetDateConsumed?: () => void
): useHistorySessionReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(() => new Set());

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const sessionKeys = useMemo(() => sessions.map(s => s.key), [sessions]);

  const toggleSessionCollapse = (key: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sessions]);

  useEffect(() => {
    setCollapsedSessions(new Set());
  }, [sessions]);

  useEffect(() => {
    if (!targetDate || sessions.length === 0) return;

    const targetKey = getDateKey(targetDate);
    const targetSessionIndex = sessions.findIndex(
      (session) => session.date && getDateKey(session.date) === targetKey
    );

    if (targetSessionIndex !== -1) {
      const targetPage = Math.floor(targetSessionIndex / ITEMS_PER_PAGE) + 1;

      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }

      setTimeout(() => {
        const sessionElement = document.getElementById(`session-${sessions[targetSessionIndex].key}`);
        if (sessionElement) {
          sessionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          sessionElement.classList.add('bg-emerald-400/10');
          setTimeout(() => {
            sessionElement.classList.remove('bg-emerald-400/10');
          }, 2000);
        }
        onTargetDateConsumed?.();
      }, 100);
    } else {
      onTargetDateConsumed?.();
    }
  }, [targetDate, sessions, currentPage, onTargetDateConsumed]);

  return {
    currentPage,
    setCurrentPage,
    currentSessions,
    totalPages,
    collapsedSessions,
    toggleSessionCollapse,
    sessionKeys,
  };
};
