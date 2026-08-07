import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigUp, Reply, Share2, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../theme/ThemeProvider';
import { FANCY_FONT } from '../../../utils/ui/uiConstants';
import { assetPath } from '../../../constants';
import {
  RedditCard,
  SnooAvatar,
  getUpvotes,
  getSubreddit,
  getColor,
  getTimeAgo,
} from './RedditCard';

// ── Data ──
interface ReviewData {
  src: string;
  label: string;
  username: string;
  quote: string;
}

const REVIEWS: ReviewData[] = [
  { src: assetPath('/carousel/7.avif'), label: 'RhubarbArtistic1335: "This is so well made. its simply incredible. Hard to believe your not a Hevy Dev. Lol / Keep it up my man !"' },
  { src: assetPath('/carousel/6.avif'), label: 'suikyo1: "Amazing work, my friend. Some time ago I had suggested that they make Hevy\'s home page very similan to what you did. It turned out really good. That part of the exercises showing which ones you\'re in overload and which ones you\'re in plateau is amazing, very well done."' },
  { src: assetPath('/carousel/4.avif'), label: 'marlon1310: "Oh wow. I didn\'t even realize you built it. I thought you were just sharing it. / Crazy stuff bro!! / Post it in hevy subreddit, I\'m sure there\'s so many people who\'d benefit from this."' },
  { src: assetPath('/carousel/11.avif'), label: '_Calegos: "Wow, simply wow! Finally a project that I find easy to use, no mandatory usage of api key or login (bless you for CSV import!), not yet tested the AI analyze but nonetheless this app is so cool, starred in an instant. / Other than that, kudos!"' },
  { src: assetPath('/carousel/10.avif'), label: 'cipherninjabyte: "This is outstanding.. it decoded my hevy app data and gave me nice suggestions."' },
  { src: assetPath('/carousel/14.avif'), label: 'JustOneNodeOfMany: "Excellent app, just what I have been waiting for and dreaming about, especially being able to see the exercise history easily. I love the way it throws up warnings re plateaus, etc. / Awesome app, thank you for developing."' },
  { src: assetPath('/carousel/1.avif'), label: 'WearyStatus3898: "keep it up man. Insane work. I loved the ui and also the theme."' },
  { src: assetPath('/carousel/2.avif'), label: 'harshhat18: "Bro this shit is crazy!!!! Now off to spend my next hour analysing my workouts on liftshift"' },
  { src: assetPath('/carousel/5.avif'), label: 'marlon1310: "I just tried it for a minute. This is damn amazing OP!!! I bought Hevy premium at Black Friday sale for the advanced analytics but even that doesn\'t do a good of a job like this app does. / For someone obsessed with numbers, this is a blessing!!!! / Blessing you with a lot of gains!!"' },
  { src: assetPath('/carousel/8.avif'), label: 'Rasphy_2009: "This is so useful!! Thank you for your hard work. I\'m definitely going to use it a lot"' },
  { src: assetPath('/carousel/12.avif'), label: 'wakaokami: "A good initiative and a great way to visualize progress. 🙌 / I was just wondering how you\'re handling passwords for the login feature, and how you\'re ensuring user privacy. / I haven\'t had time to go through the code yet, but I\'d like to contribute as well."' },
  { src: assetPath('/carousel/3.avif'), label: 'malicious08: "This is crazy bhai!"' },
  { src: assetPath('/carousel/9.avif'), label: 'Constant_play0: "Super cool! Thanks a lot for this"' },
  { src: assetPath('/carousel/15.avif'), label: '1AML3G10N: "Just checked this out. Excellent work!"' },
  { src: assetPath('/carousel/13.avif'), label: 'Conflicted_Gemini: "Look man. I don\'t need an analytical tool to tell me I\'ve beg lazy this week 😂😂😂"' },
  { src: assetPath('/carousel/16.avif'), label: 'Illustrious-Tear-542: "Very nice analytics."' },
].map((r) => {
  const match = r.label.match(/^(.+?):\s*"(.*)"$/);
  return {
    ...r,
    username: match ? match[1] : r.label,
    quote: match ? match[2] : r.label,
  };
});

const ROWS_DESKTOP = [REVIEWS.slice(0, 6), REVIEWS.slice(6, 11), REVIEWS.slice(11)];
const ROWS_MOBILE = [REVIEWS.slice(0, 8), REVIEWS.slice(8)];

// ── Types ──
interface ExpandedCardState {
  review: ReviewData;
  id: string;
  originalRect: DOMRect;
  containerRect: DOMRect;
}

// ── Marquee Row ──
function MarqueeRow({
  direction,
  items,
  isLight,
  speed = 40,
  expandedCardId,
  isPaused,
  onExpand,
  isMobile,
  flippedId,
  onFlip,
  isClosing,
}: {
  direction: 'left' | 'right';
  items: ReviewData[];
  isLight: boolean;
  speed?: number;
  expandedCardId: string | null;
  isPaused: boolean;
  onExpand: (id: string, review: ReviewData, rect: DOMRect) => void;
  isMobile: boolean;
  flippedId: string | null;
  onFlip: (id: string) => void;
  isClosing: boolean;
}) {
  const uid = useRef(`mq-${Math.random().toString(36).slice(2, 8)}`).current;
  const from = direction === 'left' ? '0' : '-50';
  const to = direction === 'left' ? '-50' : '0';
  const duration = `${Math.max(30, 110 - speed)}s`;

  // Mobile auto-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const accumulatedRef = useRef(0);
  const lastTsRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUpRef = useRef<(() => void) | null>(null);

  const syncAccumulated = () => {
    const el = scrollRef.current;
    if (!el) return;
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth <= 0) return;
    accumulatedRef.current =
      ((el.scrollLeft % halfWidth) + halfWidth) % halfWidth;
    lastTsRef.current = performance.now();
  };

  const onStartInteraction = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    if (handleUpRef.current) {
      document.removeEventListener('pointerup', handleUpRef.current);
      document.removeEventListener('pointercancel', handleUpRef.current);
    }

    const handleUp = () => {
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
      handleUpRef.current = null;
      resumeTimerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        syncAccumulated();
        resumeTimerRef.current = null;
      }, 1000);
    };
    handleUpRef.current = handleUp;
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (handleUpRef.current) {
        document.removeEventListener('pointerup', handleUpRef.current);
        document.removeEventListener('pointercancel', handleUpRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    let rafId = 0;
    lastTsRef.current = performance.now();
    const pxPerSec = 30;
    const dir = direction === 'left' ? 1 : -1;

    const halfWidth = el.scrollWidth / 2;
    if (halfWidth > 0 && dir === -1) {
      accumulatedRef.current = halfWidth;
    }
    el.scrollLeft = accumulatedRef.current;

    const tick = (ts: number) => {
      if (!isInteractingRef.current) {
        const hw = el.scrollWidth / 2;
        if (hw > 0) {
          const dt = (ts - lastTsRef.current) / 1000;
          lastTsRef.current = ts;
          accumulatedRef.current += dir * pxPerSec * dt;
          if (accumulatedRef.current >= hw) {
            accumulatedRef.current -= hw;
          } else if (accumulatedRef.current < 0) {
            accumulatedRef.current += hw;
          }
          el.scrollLeft = accumulatedRef.current;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, direction]);

  const card = (review: ReviewData, key: string) => {
    if (isMobile) {
      return (
        <div key={key} className="mx-2 sm:mx-3 shrink-0">
          <RedditCard
            username={review.username}
            quote={review.quote}
            src={review.src}
            isLight={isLight}
            cardId={key}
            isFlipped={flippedId === key}
            onFlip={() => onFlip(key)}
          />
        </div>
      );
    }

    const isHidden =
      expandedCardId !== null &&
      (key === expandedCardId || key === `${expandedCardId}-clone`);

    const cardStyle: React.CSSProperties = isHidden
      ? { opacity: 0, pointerEvents: 'none' }
      : isClosing
        ? { opacity: 1, transition: 'opacity 100ms ease 200ms' }
        : { opacity: 1 };

    return (
      <div
        key={key}
        className="mx-2 sm:mx-3 shrink-0"
        style={cardStyle}
        onClickCapture={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onExpand(review.src, review, rect);
        }}
      >
        <RedditCard
          username={review.username}
          quote={review.quote}
          src={review.src}
          isLight={isLight}
          cardId={key}
          isFlipped={false}
          onFlip={() => {}}
        />
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="relative overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden"
          onPointerDown={onStartInteraction}
          style={{
            scrollPaddingLeft: '0.5rem',
            touchAction: 'pan-x',
          }}
        >
          <div className="flex w-max py-1 pr-4">
            {items.map((r, i) => card(r, `${r.src}-${i}`))}
            {items.map((r, i) => card(r, `${r.src}-clone-${i}`))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <style>{`
        @keyframes ${uid} {
          0%   { transform: translate3d(${from}%, 0, 0); }
          100% { transform: translate3d(${to}%, 0, 0); }
        }
        .${uid} {
          display: flex;
          width: fit-content;
          animation: ${uid} ${duration} linear infinite;
          backface-visibility: hidden;
        }
        .${uid}:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className={uid}
        style={isPaused ? { animationPlayState: 'paused' } : undefined}
      >
        {items.map((r) => card(r, r.src))}
        {items.map((r) => card(r, `${r.src}-clone`))}
      </div>
    </div>
  );
}

// ── Expanded Card Overlay ──
const ExpandedCardOverlay: React.FC<{
  expandedCard: ExpandedCardState;
  isLight: boolean;
  onClose: () => void;
}> = ({ expandedCard, isLight, onClose }) => {
  const { review, originalRect, containerRect } = expandedCard;

  const { targetLeft, targetTop, expandedWidth, expandedHeight } =
    useMemo(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = (vw * 0.6) / originalRect.width;
      const scaleY = (vh * 0.65) / originalRect.height;
      const s = Math.max(1.6, Math.min(scaleX, scaleY, 2.5));
      const ew = originalRect.width * s;
      const eh = originalRect.height * s;
      const cx = containerRect.left + containerRect.width / 2;
      const cy = containerRect.top + containerRect.height / 2;
      return {
        targetLeft: cx - ew / 2,
        targetTop: cy - eh / 2,
        expandedWidth: ew,
        expandedHeight: eh,
      };
    }, [originalRect, containerRect]);

  const upvotes = useMemo(() => getUpvotes(review.username), [review.username]);
  const subreddit = useMemo(
    () => getSubreddit(review.username, review.quote),
    [review.username, review.quote],
  );
  const color = useMemo(() => getColor(review.username), [review.username]);
  const timeAgo = useMemo(
    () => getTimeAgo(review.username),
    [review.username],
  );

  const expandedFaceClass = isLight
    ? 'bg-white/35 shadow-lg'
    : 'bg-black/35 shadow-lg shadow-black/40';

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-black/70"
        onClick={onClose}
      />

      {/* Expanded card */}
      <motion.div
        initial={{
          position: 'fixed',
          left: originalRect.left,
          top: originalRect.top,
          width: originalRect.width,
          height: originalRect.height,
          rotateY: 0,
          zIndex: 101,
        }}
        animate={{
          left: targetLeft,
          top: targetTop,
          width: expandedWidth,
          height: expandedHeight,
          rotateY: 180,
        }}
        exit={{
          left: originalRect.left,
          top: originalRect.top,
          width: originalRect.width,
          height: originalRect.height,
          rotateY: 0,
          opacity: 0,
          transition: {
            opacity: { duration: 0.1, delay: 0.2 },
            default: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          },
        }}
        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
          pointerEvents: 'none',
        }}
      >
        {/* ── Front face: Reddit comment ── */}
        <div
          className={`absolute inset-0 rounded-xl flex flex-col px-4 py-3.5 gap-2 overflow-hidden ${expandedFaceClass}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <SnooAvatar color={color} size={20} />
            <span
              className={`font-medium ${isLight ? 'text-black/80' : 'text-neutral-200'}`}
            >
              r/{subreddit}
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>
              ·
            </span>
            <span className={isLight ? 'text-slate-500' : 'text-neutral-500'}>
              u/{review.username}
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>
              ·
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-500'}>
              {timeAgo}
            </span>
          </div>

          <p
            className={`flex-1 text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-800' : 'text-neutral-300'}`}
          >
            {review.quote.split(' / ').map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {part}
              </React.Fragment>
            ))}
          </p>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ArrowBigUp
              className="w-4 h-4 text-[#FF4500]"
              fill="#FF4500"
            />
            <span
              className={`font-bold tabular-nums -ml-0.5 ${isLight ? 'text-slate-700' : 'text-neutral-400'}`}
            >
              {upvotes}
            </span>
            <span
              className={`ml-auto flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </span>
            <span
              className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </span>
            <span
              className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Award className="w-3.5 h-3.5" />
              Award
            </span>
          </div>
        </div>

        {/* ── Back face: screenshot ── */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden ${expandedFaceClass}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <img
            src={review.src}
            alt={`Screenshot of ${review.username}'s Reddit comment`}
            className="w-full h-full object-contain p-4"
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        </div>

      </motion.div>
    </>,
    document.body,
  );
};

// ── Main component ──
export const ReviewsCarousel: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCard, setExpandedCard] = useState<ExpandedCardState | null>(
    null,
  );
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedCardRef = useRef(expandedCard);
  expandedCardRef.current = expandedCard;

  // Scroll lock while expanded
  useEffect(() => {
    if (!expandedCard) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const preventScroll = (e: WheelEvent | TouchEvent) => e.preventDefault();
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [expandedCard]);

  // Pause marquee when any card is expanded
  useEffect(() => {
    if (expandedCard !== null) {
      setIsMarqueePaused(true);
    }
  }, [expandedCard]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    update(mq);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const rows = isMobile ? ROWS_MOBILE : ROWS_DESKTOP;

  const handleExpand = useCallback(
    (id: string, review: ReviewData, rect: DOMRect) => {
      setExpandedCard((prev) => {
        if (prev?.id === id) return null;
        const container = containerRef.current;
        if (!container) return prev;
        const containerRect = container.getBoundingClientRect();
        return { review, id, originalRect: rect, containerRect };
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setExpandedCard(null);
  }, []);

  const handleFlip = useCallback((id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!expandedCardRef.current) {
      setIsMarqueePaused(false);
      setIsClosing(false);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Header section */}
      <section
        className="mb-9"
        aria-label="User reviews of LiftShift from Reddit"
      >
        <h2 className="sr-only">LiftShift reviews from Reddit users</h2>
        <ul className="sr-only">
          {REVIEWS.map((review, i) => (
            <li key={i}>
              <blockquote>
                <p>{review.label}</p>
              </blockquote>
            </li>
          ))}
        </ul>

        <div className="text-center">
          
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${isLight ? 'text-slate-900' : ''}`}
          >
            Loved by{' '}
            <span className="text-emerald-400" style={FANCY_FONT}>
              Lifters
            </span>{' '}
            Worldwide
          </h2>
          <p
            className={`text-lg max-w-2xl mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
          >
            See what the fitness community is saying about LiftShift on Reddit
          </p>
        </div>
      </section>

      {/* Full-width marquee */}
      <div
        className="relative"
        style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          maskImage:
            'linear-gradient(to right, transparent, black 18vw, black 82vw, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 18vw, black 82vw, transparent)',
        }}
      >
        <div className="space-y-3 sm:space-y-4">
          {rows.map((row, i) => (
            <MarqueeRow
              key={i}
              direction={i % 2 === 0 ? 'left' : 'right'}
              isLight={isLight}
              speed={25 + i * 5}
              items={row}
              expandedCardId={expandedCard?.id ?? null}
              isPaused={isMarqueePaused}
              onExpand={handleExpand}
              isMobile={isMobile}
              flippedId={flippedId}
              onFlip={handleFlip}
              isClosing={isClosing}
            />
          ))}
        </div>
      </div>

      {/* Expanded card overlay — desktop only */}
      {!isMobile && (
        <AnimatePresence onExitComplete={handleExitComplete}>
          {expandedCard && (
            <ExpandedCardOverlay
              key={expandedCard.id}
              expandedCard={expandedCard}
              isLight={isLight}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ReviewsCarousel;
