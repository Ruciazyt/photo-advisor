import { act, renderHook } from '@testing-library/react-native';
import { useCountdown } from '../useCountdown';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useCountdown', () => {
  describe('initial state', () => {
    it('starts with active=false, count=3, duration=3', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));
      expect(result.current.active).toBe(false);
      expect(result.current.count).toBe(3);
      expect(result.current.duration).toBe(3);
    });
  });

  describe('startCountdown', () => {
    it('sets active=true and count to specified duration', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(5);
      });

      expect(result.current.active).toBe(true);
      expect(result.current.count).toBe(5);
      expect(result.current.duration).toBe(5);
    });

    it('overwrites previous countdown when called while active', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(5);
      });
      expect(result.current.count).toBe(5);

      act(() => {
        result.current.startCountdown(10);
      });
      expect(result.current.count).toBe(10);
      expect(result.current.duration).toBe(10);
    });

    it('onComplete fires after countdown reaches 0 with 300ms delay', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(3);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.count).toBe(2);
      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.count).toBe(1);
      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.count).toBe(0);
      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('sets active=false when countdown completes', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(3);
      });
      expect(result.current.active).toBe(true);

      act(() => {
        jest.advanceTimersByTime(4300);
      });

      expect(result.current.active).toBe(false);
      expect(result.current.count).toBe(0);
    });
  });

  describe('cancelCountdown', () => {
    it('cancels active countdown and resets count to startCountdown duration', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(10);
      });

      act(() => {
        jest.advanceTimersByTime(3000); // count: 10→7
      });

      act(() => {
        result.current.cancelCountdown();
      });

      expect(result.current.active).toBe(false);
      expect(result.current.count).toBe(10); // resets to the duration that was set by startCountdown
    });

    it('can be called when no countdown is active (no-op)', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.cancelCountdown();
      });

      expect(result.current.active).toBe(false);
      expect(result.current.count).toBe(3); // default
    });
  });

  describe('setDuration', () => {
    it('updates duration without affecting active countdown or count', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.startCountdown(5);
      });

      act(() => {
        result.current.setDuration(10);
      });

      // duration changes; active countdown continues; count unchanged
      expect(result.current.duration).toBe(10);
      expect(result.current.active).toBe(true);
      expect(result.current.count).toBe(5);
    });

    it('affects next startCountdown call', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.setDuration(10);
      });

      act(() => {
        result.current.startCountdown(3);
      });

      // startCountdown(3) overrides the setDuration to 3
      expect(result.current.duration).toBe(3);
      expect(result.current.count).toBe(3);
    });

    it('calling setDuration then startCountdown uses startCountdown value', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      act(() => {
        result.current.setDuration(10);
      });

      act(() => {
        result.current.startCountdown(3);
      });

      expect(result.current.duration).toBe(3);
      expect(result.current.count).toBe(3);
    });
  });

  // Note: onComplete ref stability is already tested in src/__tests__/useCountdown.test.ts
  // (covers stale closure avoidance with the onCompleteRef pattern)

  describe('TIMER_OPTIONS constant', () => {
    it('exports 3s, 5s, and 10s options', () => {
      const { TIMER_OPTIONS } = require('../useCountdown');
      expect(TIMER_OPTIONS).toEqual([
        { label: '3s', value: 3 },
        { label: '5s', value: 5 },
        { label: '10s', value: 10 },
      ]);
    });
  });
});