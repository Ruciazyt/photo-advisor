/**
 * useDebounce — debounces a value by the given delay.
 * Cleanup is automatic on unmount to avoid state updates on unmounted components.
 */

import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<T>(value);

  useEffect(() => {
    valueRef.current = value;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    if (delay === 0) {
      setDebouncedValue(value);
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(valueRef.current);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
