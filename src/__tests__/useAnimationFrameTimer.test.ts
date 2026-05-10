import { useAnimationFrameTimer, TIMER_INTERVAL_MS } from '../hooks/useAnimationFrameTimer';
import { renderHook, act } from '@testing-library/react-native';

// Mock react-native-reanimated
const mockRunOnJS = jest.fn();
const mockUseFrameCallback = jest.fn();

jest.mock('react-native-reanimated', () => {
  const mockUseFrameCallbackFn = (...args: unknown[]) => {
    return (mockUseFrameCallback as jest.Mock).call(null, ...args);
  };
  return {
    useFrameCallback: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (frameInfo: any) => void,
      _enabled?: boolean
    ) => mockUseFrameCallbackFn(callback, _enabled),
    runOnJS: (fn: () => void) => {
      mockRunOnJS(fn);
      return fn;
    },
  };
});

describe('useAnimationFrameTimer', () => {
  let mockCallbacks: Array<(frameInfo: { timeSincePreviousFrame: number | null }) => void> = [];

  beforeEach(() => {
    jest.useFakeTimers();
    mockCallbacks = [];
    mockRunOnJS.mockClear();
    mockUseFrameCallback.mockImplementation((callback: Function, _enabled?: boolean) => {
      mockCallbacks.length = 0;
      mockCallbacks.push(callback as (frameInfo: { timeSincePreviousFrame: number | null }) => void);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('TIMER_INTERVAL_MS constant', () => {
    it('exports the correct interval value', () => {
      expect(TIMER_INTERVAL_MS).toBe(500);
    });
  });

  describe('hook initialization', () => {
    it('does not call onTick immediately on mount when enabled', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));
      expect(onTick).not.toHaveBeenCalled();
    });

    it('registers useFrameCallback with enabled=true when enabled', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));
      expect(mockUseFrameCallback).toHaveBeenCalledWith(expect.any(Function), true);
    });

    it('registers useFrameCallback with enabled=false when disabled', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: false }));
      expect(mockUseFrameCallback).toHaveBeenCalledWith(expect.any(Function), false);
    });
  });

  describe('frame callback timing logic', () => {
    it('does not trigger onTick when accumulated time is below interval', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 100 }));
      });

      expect(onTick).not.toHaveBeenCalled();
    });

    it('triggers onTick when accumulated time meets interval', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 250 }));
      });

      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('triggers onTick multiple times when interval is significantly exceeded', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 1200 }));
      });

      // Should trigger twice for 1200ms with 500ms interval
      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('resets accumulated time after triggering onTick', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 600 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 100 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 400 }));
      });
      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('handles null timeSincePreviousFrame as 0', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        const nullVal: number | null = null;
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: nullVal }));
      });

      expect(onTick).not.toHaveBeenCalled();
    });

    it('accumulates time across multiple frames correctly', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 100 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 150 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);
    });
  });

  describe('dynamic parameter updates', () => {
    it('respects custom interval values', () => {
      const onTick = jest.fn();
      renderHook(() => useAnimationFrameTimer({ intervalMs: 1000, onTick, enabled: true }));

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 500 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 500 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('handles enabled state change correctly', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { enabled: boolean }>(
        ({ enabled }) => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      rerender({ enabled: false });

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 800 }));
      });
      expect(onTick).not.toHaveBeenCalled();
    });

    it('resumes timing after re-enabling', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { enabled: boolean }>(
        ({ enabled }) => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 600 }));
      });

      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('uses the latest onTick when changed via enabled toggle', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { enabled: boolean; onTick: () => void }>(
        ({ enabled, onTick: ot }) => useAnimationFrameTimer({ intervalMs: 500, onTick: ot, enabled }),
        { initialProps: { enabled: true, onTick } }
      );

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 600 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);

      const newOnTick = jest.fn();
      rerender({ enabled: false, onTick: newOnTick });

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 600 }));
      });
      expect(newOnTick).not.toHaveBeenCalled();

      rerender({ enabled: true, onTick: newOnTick });

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 600 }));
      });
      expect(newOnTick).toHaveBeenCalledTimes(1);
    });

    it('does not tick immediately when enabled toggles true→false→true (lastTickRef resets)', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { enabled: boolean }>(
        ({ enabled }) => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled }),
        { initialProps: { enabled: true } }
      );

      // Advance just below the interval so next frame will tick
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 400 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      // Disable — accumulated time is preserved in lastTickRef (400ms)
      rerender({ enabled: false });

      // Re-enable — lastTickRef must be reset to 0
      rerender({ enabled: true });

      // A single frame of 300ms should NOT trigger tick (needs 500ms total from reset)
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      // Second frame reaches 300+300=600 >= 500, now tick fires
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('resets lastTickRef when onTick callback identity changes', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { onTick: () => void }>(
        ({ onTick: ot }) => useAnimationFrameTimer({ intervalMs: 500, onTick: ot, enabled: true }),
        { initialProps: { onTick } }
      );

      // Advance just below the interval
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 400 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      // Replace onTick with a new function (identity change)
      const newOnTick = jest.fn();
      rerender({ onTick: newOnTick });

      // A single frame of 300ms should NOT trigger tick (lastTickRef was reset)
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(newOnTick).not.toHaveBeenCalled();

      // Second frame: 300+300=600 >= 500, now tick fires
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 300 }));
      });
      expect(newOnTick).toHaveBeenCalledTimes(1);
    });

    it('holds without ticking while disabled (enabled=false)', () => {
      const onTick = jest.fn();

      const { rerender } = renderHook<ReturnType<typeof useAnimationFrameTimer>, { enabled: boolean }>(
        ({ enabled }) => useAnimationFrameTimer({ intervalMs: 500, onTick, enabled }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 400 }));
      });

      rerender({ enabled: false });

      // Even very large frames while disabled should not trigger tick
      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 1000 }));
      });
      expect(onTick).not.toHaveBeenCalled();

      rerender({ enabled: true });

      act(() => {
        mockCallbacks.forEach(cb => cb({ timeSincePreviousFrame: 1000 }));
      });
      // Re-enabled with reset lastTickRef; a 1000ms frame triggers 2 ticks (1000/500=2)
      expect(onTick).toHaveBeenCalledTimes(2);
    });
  });
});
