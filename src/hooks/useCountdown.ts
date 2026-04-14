import { useState, useRef, useCallback } from 'react';
import type { TimerDuration, UseCountdownOptions } from '../types';
export type { TimerDuration } from '../types';

export const TIMER_OPTIONS: { label: string; value: TimerDuration }[] = [
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
];
export function useCountdown({ onComplete }: UseCountdownOptions) {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(3);
  const [duration, setDuration] = useState<TimerDuration>(3);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const startCountdown = useCallback((dur: TimerDuration) => {
    stopCountdown();
    setDuration(dur);
    setCount(dur);
    setActive(true);

    intervalRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          stopCountdown();
          setActive(false);
          // Small delay so user sees the "1" before shutter fires
          setTimeout(() => onCompleteRef.current(), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    stopCountdown();
    setActive(false);
    setCount(duration);
  }, [stopCountdown, duration]);

  return {
    active,
    count,
    duration,
    startCountdown,
    cancelCountdown,
    setDuration,
  };
}
