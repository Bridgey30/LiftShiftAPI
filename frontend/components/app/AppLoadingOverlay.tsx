import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { CsvLoadingAnimation, PuzzleLoadingAnimation } from '../modals/csvImport';

interface AppLoadingOverlayProps {
  open: boolean;
  isCompleting: boolean;
}

// Single message pool - no phases
const LOADING_MESSAGES = [
  'Warming things up...',
  'Starting services...',
  'Setting up your space...',
  'Preparing the environment...',
  'Loading settings...',
  'Connecting to servers...',
  'Establishing a secure connection...',
  'Requesting your data...',
  'Fetching workout history...',
  'Downloading workout records...',
  'Receiving your workouts...',
  'Processing sets and reps...',
  'Syncing everything...',
  'Building your dashboard...',
  'Creating charts and visuals...',
  'Generating insights...',
  'Preparing workout views...',
  'Calculating display data...',
  'Rendering the interface...',
  'Final touches...',
  'Solving Captcha for you...',
  'Almost ready...',
];

const ROW_HEIGHT = 36;
const VISIBLE_COUNT = 4;
const INTERVAL_MS = 400;
const SLIDE_MS = 100;
const INITIAL_DELAY_MS = 150;

const getVisibleMessages = (baseIndex: number, isCompleting: boolean) => {
  const messages = [] as Array<{
    text: string;
    state: 'completed' | 'active' | 'pending';
    key: string;
  }>;

  const completedCount = isCompleting ? VISIBLE_COUNT : Math.min(2, baseIndex);

  for (let offset = 0; offset < VISIBLE_COUNT; offset++) {
    const msgIndex = baseIndex + offset;
    if (msgIndex >= LOADING_MESSAGES.length) break;
    let state: 'completed' | 'active' | 'pending';
    if (offset < completedCount) state = 'completed';
    else if (offset === completedCount) state = 'active';
    else state = 'pending';

    messages.push({
      text: LOADING_MESSAGES[msgIndex],
      state,
      key: `${msgIndex}-${LOADING_MESSAGES[msgIndex]}`,
    });
  }

  return messages;
};

export const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({
  open,
  isCompleting,
}) => {
  const [baseIndex, setBaseIndex] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!open) {
      setBaseIndex(0);
      setSlideOffset(0);
      setIsTransitioning(false);
      return;
    }

    let tickTimeout: number | null = null;
    const advance = () => {
      // Enable transition and start sliding up
      setIsTransitioning(true);
      setSlideOffset(-ROW_HEIGHT);
      
      // After animation completes, update index and reset position instantly (no transition)
      tickTimeout = window.setTimeout(() => {
        const lastWindowStart = Math.max(0, LOADING_MESSAGES.length - VISIBLE_COUNT);
        setBaseIndex((prev) => (prev >= lastWindowStart ? prev : prev + 1));
        setIsTransitioning(false);
        setSlideOffset(0);
      }, SLIDE_MS);
    };

    const initialTimeout = window.setTimeout(advance, INITIAL_DELAY_MS);
    const interval = window.setInterval(() => {
      const lastWindowStart = Math.max(0, LOADING_MESSAGES.length - VISIBLE_COUNT);
      if (baseIndex >= lastWindowStart) {
        return;
      }
      advance();
    }, INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (tickTimeout) window.clearTimeout(tickTimeout);
    };
  }, [open, baseIndex]);

  if (!open) return null;

  const visibleMessages = getVisibleMessages(baseIndex, isCompleting);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in px-4 sm:px-6">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <CsvLoadingAnimation className="mb-6" size={160} />
        <h2 className="text-2xl font-bold text-white mb-2">Crunching your numbers</h2>
        <p className="text-slate-400 mb-6 text-center">
          Syncing your workouts and preparing your dashboard.
        </p>

        <div className="w-full space-y-3">
          {/* Sliding message list */}
          <div className="relative h-[144px] overflow-hidden">
            <div
              className="absolute left-0 right-0 top-0"
              style={{
                transform: `translateY(${slideOffset}px)`,
                transition: isTransitioning ? `transform ${SLIDE_MS}ms ease-out` : 'none',
              }}
            >
              {visibleMessages.map((msg) => (
                <div
                  key={msg.key}
                  className={`flex items-center space-x-3 text-sm h-[36px] transition-opacity duration-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    msg.state === 'completed' ? 'opacity-60' : msg.state === 'active' ? 'opacity-100' : 'opacity-40'
                  }`}>
                  {msg.state === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : msg.state === 'active' ? (
                    msg.text.includes('Captcha') ? (
                      <PuzzleLoadingAnimation size={20} />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex-shrink-0" />
                  )}
                  <span className={msg.state === 'pending' ? 'text-slate-600' : 'text-slate-500'}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
