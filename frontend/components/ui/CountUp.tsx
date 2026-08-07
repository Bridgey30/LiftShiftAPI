import { animate, useInView, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };

      const formattedNumber = Intl.NumberFormat('en-US', options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator]
  );

  const start = direction === 'down' ? to : from;
  const end = direction === 'down' ? from : to;

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(startWhen ? start : end);
    }
  }, [start, end, startWhen, formatValue]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isInView || !startWhen) return;

    if (typeof onStart === 'function') {
      onStart();
    }

    if (reduceMotion) {
      el.textContent = formatValue(end);
      if (typeof onEnd === 'function') {
        onEnd();
      }
      return;
    }

    const controls = animate(start, end, {
      duration: Math.max(0, duration),
      delay,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (latest: number) => {
        if (el) {
          el.textContent = formatValue(latest);
        }
      },
      onComplete: () => {
        if (typeof onEnd === 'function') {
          onEnd();
        }
      },
    });

    return () => controls.stop();
  }, [isInView, startWhen, direction, from, to, delay, duration, onStart, onEnd, formatValue, reduceMotion]);

  return <span className={className} ref={ref} />;
}
