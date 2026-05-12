/**
 * Unit tests for useAnimationFrameTimer hook.
 *
 * Behaviors tested:
 * - Returns empty object (no returned values)
 * - Registers useFrameCallback when enabled=true (and does not when false)
 * - Resets internal timer (lastTickRef) when enabled goes false→true
 * - Resets internal timer when onTick reference changes
 * - Does NOT reset timer on re-render with same enabled/onTick
 * - Calls onTick via runOnJS when frame time accumulates past interval
 * - Calls onTick multiple times when cumulative frame time exceeds interval significantly
 * - Respects custom intervalMs values
 */

jest.mock('react-native-reanimated', () => {
  let frameCallbacks: Array<(frameInfo: { timeSincePreviousFrame: number | null }) => void> = [];
  return {
    __getFrameCallbacks: () => frameCallbacks,
    __clearFrameCallbacks: () => { frameCallbacks = []; },
    useFrameCallback: jest.fn((callback: (frameInfo: { timeSincePreviousFrame: number | null }) => void, enabled: boolean) => {
      // Each render/re-render replaces the callback (only one active at a time)
      frameCallbacks = enabled ? [callback] : [];
      return undefined;
    }),
    runOnJS: jest.fn((fn: () => void) => fn),
  };
});

import { useAnimationFrameTimer } from '../useAnimationFrameTimer';
import { renderHook } from '@testing-library/react-native';

const reanimated = require('react-native-reanimated');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trigger all captured frame callbacks with a given frame delta (ms) */
function triggerCallbacks(deltaMs: number) {
  reanimated.__getFrameCallbacks().forEach((cb: (info: { timeSincePreviousFrame: number | null }) => void) => {
    cb({ timeSincePreviousFrame: deltaMs });
  });
}

describe('useAnimationFrameTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reanimated.__clearFrameCallbacks();
  });

  afterEach(() => {
    reanimated.__clearFrameCallbacks();
  });

  // -------------------------------------------------------------------------
  // Return value
  // -------------------------------------------------------------------------
  describe('return value', () => {
    it('returns an empty object', () => {
      const { result } = renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick: jest.fn(), enabled: true })
      );
      expect(result.current).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // useFrameCallback registration
  // -------------------------------------------------------------------------
  describe('useFrameCallback registration', () => {
    it('registers useFrameCallback when enabled=true', () => {
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick: jest.fn(), enabled: true })
      );
      expect(reanimated.useFrameCallback).toHaveBeenCalledTimes(1);
    });

    it('passes enabled as the second argument to useFrameCallback', () => {
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick: jest.fn(), enabled: true })
      );
      expect(reanimated.useFrameCallback.mock.calls[0][1]).toBe(true);
    });

    it('does NOT call runOnJS at registration time', () => {
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick: jest.fn(), enabled: true })
      );
      expect(reanimated.runOnJS).not.toHaveBeenCalled();
    });

    it('registers empty array when enabled=false', () => {
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick: jest.fn(), enabled: false })
      );
      expect(reanimated.__getFrameCallbacks()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // onTick firing via frame callback trigger
  // -------------------------------------------------------------------------
  describe('onTick firing via frame callback trigger', () => {
    it('fires onTick after one frame of exactly intervalMs', () => {
      const onTick = jest.fn();
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true })
      );

      triggerCallbacks(500);
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('fires onTick after cumulative frames exceed interval', () => {
      const onTick = jest.fn();
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true })
      );

      // Three frames: 200 + 200 + 200 = 600ms > 500ms interval → 1 tick
      triggerCallbacks(200);
      triggerCallbacks(200);
      triggerCallbacks(200);

      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('fires onTick multiple times when single frame delta far exceeds interval', () => {
      const onTick = jest.fn();
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true })
      );

      // 2100ms / 500ms = 4.2 → should fire 4 times
      triggerCallbacks(2100);
      expect(onTick).toHaveBeenCalledTimes(4);
    });

    it('respects custom intervalMs values', () => {
      const onTick = jest.fn();
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 1000, onTick, enabled: true })
      );

      // 500ms frame on 1000ms interval → not enough
      triggerCallbacks(500);
      expect(onTick).not.toHaveBeenCalled();

      // Another 500ms → total 1000ms → 1 tick
      triggerCallbacks(500);
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onTick when cumulative time is below interval', () => {
      const onTick = jest.fn();
      renderHook(() =>
        useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true })
      );

      triggerCallbacks(100);
      triggerCallbacks(100);
      triggerCallbacks(100);
      expect(onTick).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Timer reset on enabled false→true
  // -------------------------------------------------------------------------
  describe('timer reset on enabled false→true', () => {
    it('resets timer when enabled goes from false to true', () => {
      const onTick = jest.fn();

      // Start with enabled=false
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useAnimationFrameTimer({ intervalMs: 500, onTick, enabled }),
        { initialProps: { enabled: false } }
      );

      // Switch to enabled=true — this creates a new callback and resets timer
      rerender({ enabled: true });

      // Accumulate 300ms — still below 500ms, no fire
      triggerCallbacks(100);
      triggerCallbacks(100);
      triggerCallbacks(100);
      expect(onTick).not.toHaveBeenCalled();

      // Continue to 500ms total — should fire once
      triggerCallbacks(200);
      expect(onTick).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Timer reset on onTick reference change
  // -------------------------------------------------------------------------
  describe('timer reset on onTick reference change', () => {
    it('resets timer when onTick function reference changes', () => {
      const onTickA = jest.fn();
      const onTickB = jest.fn();

      const { rerender } = renderHook(
        ({ onTick }: { onTick: () => void }) =>
          useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }),
        { initialProps: { onTick: onTickA } }
      );

      // Accumulate 300ms — no fire yet
      triggerCallbacks(100);
      triggerCallbacks(100);
      triggerCallbacks(100);
      expect(onTickA).not.toHaveBeenCalled();
      expect(onTickB).not.toHaveBeenCalled();

      // Change onTick — timer resets (prevOnTickRef detection)
      rerender({ onTick: onTickB });

      // 200ms more → timer at 200ms (reset), still below 500ms
      triggerCallbacks(200);
      expect(onTickA).not.toHaveBeenCalled();
      expect(onTickB).not.toHaveBeenCalled();

      // 300ms more → timer reaches 500ms → fires once with onTickB
      triggerCallbacks(300);
      expect(onTickA).not.toHaveBeenCalled();
      expect(onTickB).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Stable onTick does not reset timer
  // -------------------------------------------------------------------------
  describe('stable onTick does not reset timer', () => {
    it('does not reset timer on re-render with same onTick reference', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook(
        ({ count }: { count: number }) => {
          // Changing count forces re-render but onTick reference is stable
          return useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true });
        },
        { initialProps: { count: 0 } }
      );

      // Accumulate 300ms total — still below 500ms
      triggerCallbacks(100);
      triggerCallbacks(100);
      triggerCallbacks(100);
      expect(onTick).not.toHaveBeenCalled();

      // Re-render (same onTick) — timer should NOT reset
      rerender({ count: 1 });

      // 100ms more → 400ms total → still below 500ms, no fire
      triggerCallbacks(100);
      expect(onTick).not.toHaveBeenCalled();

      // 100ms more → 500ms total → fires once
      triggerCallbacks(100);
      expect(onTick).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Interval change (resets timer because prevOnTickRef !== onTick after rerender)
  // -------------------------------------------------------------------------
  describe('intervalMs changes', () => {
    it('uses the new intervalMs after a change', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook(
        ({ intervalMs }: { intervalMs: number }) =>
          useAnimationFrameTimer({ intervalMs, onTick, enabled: true }),
        { initialProps: { intervalMs: 500 } }
      );

      // 250ms on 500ms interval → no fire
      triggerCallbacks(250);
      expect(onTick).not.toHaveBeenCalled();

      // Change interval to 200ms — rerender causes prevOnTickRef detection
      // → timer resets to 0
      rerender({ intervalMs: 200 });

      // 250ms on 200ms interval → fires once, remainder 50ms
      triggerCallbacks(250);
      expect(onTick).toHaveBeenCalledTimes(1);
    });
  });
});