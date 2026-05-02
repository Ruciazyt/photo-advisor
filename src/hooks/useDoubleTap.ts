import { useRef, useCallback } from 'react';

export function useDoubleTap(callback: () => void, delayMs = 300) {
  const lastPressRef = useRef<number>(0);

  return useCallback(() => {
    const now = Date.now();
    const delta = now - lastPressRef.current;
    lastPressRef.current = now;
    if (delta < delayMs && delta > 0) {
      callback();
      lastPressRef.current = 0; // reset to prevent triple-tap triggering twice
    }
  }, [callback, delayMs]);
}
