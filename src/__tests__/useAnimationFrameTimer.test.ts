import { useAnimationFrameTimer, TIMER_INTERVAL_MS } from '../hooks/useAnimationFrameTimer';
import { renderHook, act } from '@testing-library/react-native';

// Mock react-native-reanimated
const mockRunOnJS = jest.fn();
const mockUseFrameCallback = jest.fn();

jest.mock('react-native-reanimated', () => ({
  useFrameCallback: (...args: unknown[]) => mockUseFrameCallback(...args),
  runOnJS: (fn: () => void) => {
    mockRunOnJS(fn);
    return fn;
  },
}));

describe('useAnimationFrameTimer', () => {
  let mockCallbacks: Array<(frameInfo: { timeSincePreviousFrame: number | null }) => void> = [];

  beforeEach(() => {
    jest.useFakeTimers();
    mockCallbacks = [];
    mockRunOnJS.mockClear();
    mockUseFrameCallback.mockImplementation((callback: (frameInfo: { timeSincePreviousFrame: number | null }) => void, _enabled?: boolean) => {
      // Real implementation replaces callback when useFrameCallback re-renders with new enabled value
      mockCallbacks.length = 0;
      mockCallbacks.push(callback);
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

      const { rerender } = renderHook(
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

      const { rerender } = renderHook(
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

      const { rerender } = renderHook(
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
  });
});
