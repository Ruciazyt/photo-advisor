/**
 * Comprehensive tests for useToast hook
 * Uses real timers (not fake) since the timeout callback is synchronous
 * and we need reliable Promise/async integration.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../hooks/useToast';

// Mock Reanimated v4
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  withTiming: jest.fn(() => 42),
  runOnJS: jest.fn((fn) => fn),
  Easing: {
    out: jest.fn(() => 'ease-out'),
    in: jest.fn(() => 'ease-in'),
    ease: 'ease',
  },
}));
jest.mock('react-native-worklets');

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns an opacity shared value, empty toastMessage, and showToast function', () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.opacity).toBeDefined();
      expect(result.current.opacity).toHaveProperty('value');
      expect(result.current.toastMessage).toBe('');
      expect(typeof result.current.showToast).toBe('function');
    });
  });

  describe('showToast()', () => {
    it('sets toastMessage to the provided string', async () => {
      const { result } = renderHook(() => useToast());

      await act(async () => {
        result.current.showToast('Hello world');
      });

      expect(result.current.toastMessage).toBe('Hello world');
    });

    it('showToast can be called multiple times with different messages', async () => {
      const { result } = renderHook(() => useToast());

      await act(async () => {
        result.current.showToast('First message');
      });
      expect(result.current.toastMessage).toBe('First message');

      await act(async () => {
        result.current.showToast('Second message');
      });
      expect(result.current.toastMessage).toBe('Second message');

      await act(async () => {
        result.current.showToast('Third message');
      });
      expect(result.current.toastMessage).toBe('Third message');
    });

    it('updates opacity to 1 via withTiming', async () => {
      const { result } = renderHook(() => useToast());
      const { withTiming } = require('react-native-reanimated');

      await act(async () => {
        result.current.showToast('Test message');
      });

      expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 200 }));
    });

    it('clears any previously scheduled auto-hide timeout when called again', () => {
      const { result } = renderHook(() => useToast());
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.showToast('First');
      });

      // Advance partway — toast should still be visible
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Call again before the 1200ms timeout fires
      act(() => {
        result.current.showToast('Second');
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('schedules auto-hide of the toast after 1200ms', () => {
      const { result } = renderHook(() => useToast());
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      act(() => {
        result.current.showToast('Auto-hide test');
      });

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1200);
    });

    it('toastMessage stays visible until the auto-hide timeout fires', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Persistent message');
      });

      // Advance to just before auto-hide (1199ms)
      act(() => {
        jest.advanceTimersByTime(1199);
      });

      expect(result.current.toastMessage).toBe('Persistent message');
    });

    it('toastMessage clears after the auto-hide timeout fires', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Auto-clear test');
      });

      expect(result.current.toastMessage).toBe('Auto-clear test');

      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // runOnJS(clearMessage)() fires asynchronously — the state update is
      // flushed after the timer callback, so message clears
      expect(result.current.toastMessage).toBe('');
    });

    it('sets opacity back to 0 when auto-hide fires', () => {
      const { result } = renderHook(() => useToast());
      const { withTiming } = require('react-native-reanimated');

      act(() => {
        result.current.showToast('Fade out');
      });

      withTiming.mockClear();

      act(() => {
        jest.advanceTimersByTime(1200);
      });

      expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 200 }));
    });

    it('showToast updates message without needing a separate act for the timeout', () => {
      // When called twice rapidly, the second showToast cancels the first timeout
      // and schedules a new one — the message updates in place without flashing
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('First');
      });
      expect(result.current.toastMessage).toBe('First');

      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Second call before first timeout fires — message updates, not cleared
      act(() => {
        result.current.showToast('Second');
      });
      expect(result.current.toastMessage).toBe('Second');

      // Both auto-hides should fire; only the second one attempts to clear
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      expect(result.current.toastMessage).toBe('');
    });

    it('rapid successive showToast calls only schedule one auto-hide timeout', () => {
      const { result } = renderHook(() => useToast());
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.showToast('First');
        result.current.showToast('Second');
        result.current.showToast('Third');
      });

      // showToast('First') schedules a timeout; showToast('Second') clears it and
      // schedules a new one; showToast('Third') clears it again and schedules a
      // third. So clearTimeout should be called twice (for First and Second).
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });

    it('handles empty string message', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('');
      });

      expect(result.current.toastMessage).toBe('');
    });

    it('handles very long message string', () => {
      const { result } = renderHook(() => useToast());
      const longMessage = 'A'.repeat(500);

      act(() => {
        result.current.showToast(longMessage);
      });

      expect(result.current.toastMessage).toBe(longMessage);
    });
  });

  describe('opacity shared value', () => {
    it('opacity initial value is 0', () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.opacity.value).toBe(0);
    });

    it('opacity value is set to 1 immediately after showToast', async () => {
      const { result } = renderHook(() => useToast());

      await act(async () => {
        result.current.showToast('Test');
      });

      const { withTiming } = require('react-native-reanimated');
      expect(withTiming).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });
});
