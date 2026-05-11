/**
 * Tests for useBurstMode hook — burst photo capture management.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useBurstMode } from '../useBurstMode';

describe('useBurstMode', () => {
  describe('initial state', () => {
    it('initializes burstActive to false', () => {
      const { result } = renderHook(() => useBurstMode());
      expect(result.current.burstActive).toBe(false);
    });

    it('initializes burstCount to 0', () => {
      const { result } = renderHook(() => useBurstMode());
      expect(result.current.burstCount).toBe(0);
    });

    it('initializes showBurstSuggestion to false', () => {
      const { result } = renderHook(() => useBurstMode());
      expect(result.current.showBurstSuggestion).toBe(false);
    });

    it('initializes burstSuggestionText as a ref with empty string', () => {
      const { result } = renderHook(() => useBurstMode());
      expect(result.current.burstSuggestionText).toBeDefined();
      expect(result.current.burstSuggestionText.current).toBe('');
    });

    it('returns all required state and setters', () => {
      const { result } = renderHook(() => useBurstMode());
      expect(result.current).toHaveProperty('burstActive');
      expect(result.current).toHaveProperty('setBurstActive');
      expect(result.current).toHaveProperty('burstCount');
      expect(result.current).toHaveProperty('setBurstCount');
      expect(result.current).toHaveProperty('showBurstSuggestion');
      expect(result.current).toHaveProperty('setShowBurstSuggestion');
      expect(result.current).toHaveProperty('burstSuggestionText');
      expect(result.current).toHaveProperty('startBurst');
    });
  });

  describe('startBurst', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fires doCapture immediately on first call', () => {
      const doCapture = jest.fn();
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(doCapture);
      });

      expect(doCapture).toHaveBeenCalledTimes(1);
    });

    it('sets burstActive to true immediately', () => {
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(jest.fn());
      });

      expect(result.current.burstActive).toBe(true);
    });

    it('sets burstCount to 1 after first shot', () => {
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(jest.fn());
      });

      expect(result.current.burstCount).toBe(1);
    });

    it('schedules 4 more captures at 700ms intervals (total 5 shots)', () => {
      const doCapture = jest.fn();
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(doCapture);
      });

      // Advance 700ms for each of the remaining 4 shots
      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(doCapture).toHaveBeenCalledTimes(2);
      expect(result.current.burstCount).toBe(2);

      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(doCapture).toHaveBeenCalledTimes(3);
      expect(result.current.burstCount).toBe(3);

      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(doCapture).toHaveBeenCalledTimes(4);
      expect(result.current.burstCount).toBe(4);

      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(doCapture).toHaveBeenCalledTimes(5);
      expect(result.current.burstCount).toBe(5);
    });

    it('clears interval and sets burstActive=false after 5 shots', () => {
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(jest.fn());
      });

      expect(result.current.burstActive).toBe(true);

      // Advance through all 4 remaining intervals
      act(() => {
        jest.advanceTimersByTime(700 * 4);
      });

      expect(result.current.burstActive).toBe(false);
      // No additional interval should fire
      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(result.current.burstCount).toBe(5);
    });

    it('calls setSuggestions with completion message after 5 shots', () => {
      const setSuggestions = jest.fn();
      const { result } = renderHook(() =>
        useBurstMode({ setSuggestions })
      );

      act(() => {
        result.current.startBurst(jest.fn());
      });

      act(() => {
        jest.advanceTimersByTime(700 * 4);
      });

      expect(setSuggestions).toHaveBeenCalledTimes(1);
      expect(setSuggestions).toHaveBeenCalledWith(
        expect.not.arrayContaining(['连拍完成：共5张'])
      );
      // Verify the message contains the shot count
      const [[callArg]] = setSuggestions.mock.calls;
      const suggestions = typeof callArg === 'function'
        ? callArg([])
        : callArg;
      expect(suggestions[suggestions.length - 1]).toBe('连拍完成：共5张');
    });

    it('guards against re-entry when burstActive is true', () => {
      const doCapture = jest.fn();
      const { result } = renderHook(() => useBurstMode());

      // First call — starts burst
      act(() => {
        result.current.startBurst(doCapture);
      });

      expect(result.current.burstActive).toBe(true);

      // Second call while burstActive=true — should return early, no additional capture
      act(() => {
        result.current.startBurst(doCapture);
      });

      // doCapture should still only have been called once (the initial shot)
      expect(doCapture).toHaveBeenCalledTimes(1);
    });

    it('burstSuggestionText ref is maintained across shots', () => {
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(jest.fn());
      });

      // Ref should still be the same object
      expect(result.current.burstSuggestionText).toBeDefined();
      expect(typeof result.current.burstSuggestionText.current).toBe('string');

      act(() => {
        jest.advanceTimersByTime(700 * 4);
      });

      // Ref should still be accessible
      expect(result.current.burstSuggestionText.current).toBe('');
    });

    it('resets burstCount to 0 at start of new burst', () => {
      const doCapture = jest.fn();
      const { result } = renderHook(() => useBurstMode());

      // Manually set burstCount to a non-zero value
      act(() => {
        result.current.setBurstCount(3);
      });
      expect(result.current.burstCount).toBe(3);

      // Start burst — should reset to 1 (first shot)
      act(() => {
        result.current.startBurst(doCapture);
      });

      expect(result.current.burstCount).toBe(1);
    });
  });

  describe('setSuggestions integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call setSuggestions when not provided', () => {
      const { result } = renderHook(() => useBurstMode());

      act(() => {
        result.current.startBurst(jest.fn());
      });

      act(() => {
        jest.advanceTimersByTime(700 * 4);
      });

      // No error should be thrown
      expect(result.current.burstActive).toBe(false);
    });
  });
});
