import { useRef } from 'react';
import { useFrameCallback, runOnJS } from 'react-native-reanimated';

// Exported for testability
export const TIMER_INTERVAL_MS = 500;

interface UseAnimationFrameTimerOptions {
  intervalMs: number;
  onTick: () => void;
  enabled: boolean;
}

/**
 * useAnimationFrameTimer — UI-thread interval timer using useFrameCallback.
 * Replaces setInterval for animation-synced timing (e.g., focus peaking capture).
 * The onTick callback is still called on the JS thread (for async work like camera.capture),
 * but the scheduling itself runs on the UI thread.
 */
export function useAnimationFrameTimer({ intervalMs, onTick, enabled }: UseAnimationFrameTimerOptions) {
  const lastTickRef = useRef(0);
  const enabledRef = useRef(enabled);
  const onTickRef = useRef(onTick);

  // Keep refs up to date without restarting the frame callback
  enabledRef.current = enabled;
  onTickRef.current = onTick;

  // useFrameCallback runs on the UI thread — time delta is available as a worklet
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!enabledRef.current) return;
    const now = frameInfo.timeSincePreviousFrame ?? 0;
    lastTickRef.current += now;
    if (lastTickRef.current >= intervalMs) {
      lastTickRef.current = 0;
      // runOnJS to call the async onTick on JS thread
      runOnJS(onTickRef.current)();
    }
  }, enabled);

  return {};
}
