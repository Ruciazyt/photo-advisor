import { renderHook, act } from '@testing-library/react-native';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with active=false, count=3, duration=3', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));
    expect(result.current.active).toBe(false);
    expect(result.current.count).toBe(3);
    expect(result.current.duration).toBe(3);
  });

  it('startCountdown begins countdown at the given duration', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(5);
    });

    expect(result.current.active).toBe(true);
    expect(result.current.count).toBe(5);
    expect(result.current.duration).toBe(5);
  });

  it('count decrements each second when interval fires', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(3);
    });
    expect(result.current.count).toBe(3);

    // Advance 1 second → interval fires
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.count).toBe(2);

    // Another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.count).toBe(1);
  });

  it('calls onComplete after count reaches 0 with 300ms delay', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(3);
    });

    // Advance 3 seconds — onComplete not yet called (300ms delay)
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.count).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();

    // Advance past the 300ms delay
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('active becomes false after countdown completes', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(3);
    });
    expect(result.current.active).toBe(true);

    // Advance 3s + 300ms
    act(() => {
      jest.advanceTimersByTime(3300);
    });

    expect(result.current.active).toBe(false);
  });

  it('cancelCountdown stops the countdown and resets count to duration', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(5);
    });
    expect(result.current.count).toBe(5);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(3);

    act(() => {
      result.current.cancelCountdown();
    });

    expect(result.current.active).toBe(false);
    expect(result.current.count).toBe(5); // resets to duration
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cancelCountdown resets to current duration, not originally started duration', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(10);
    });
    act(() => {
      result.current.setDuration(5);
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(8);

    act(() => {
      result.current.cancelCountdown();
    });

    // Resets to current duration (5), not original (10)
    expect(result.current.count).toBe(5);
  });

  it('calling startCountdown again resets the countdown', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(5);
    });
    expect(result.current.count).toBe(5);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(3);

    // Start a new 3-second countdown
    act(() => {
      result.current.startCountdown(3);
    });

    expect(result.current.active).toBe(true);
    expect(result.current.count).toBe(3);
    expect(result.current.duration).toBe(3);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.count).toBe(2);
  });

  it('setDuration updates duration without affecting active countdown', () => {
    const { result } = renderHook(() => useCountdown({ onComplete }));

    act(() => {
      result.current.startCountdown(5);
    });
    act(() => {
      result.current.setDuration(10);
    });

    expect(result.current.duration).toBe(10);
    expect(result.current.active).toBe(true);
    expect(result.current.count).toBe(5); // count unchanged
  });

  it('onComplete uses latest callback via ref pattern (stale closure avoided)', () => {
    const onCompleteA = jest.fn();
    const onCompleteB = jest.fn();

    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useCountdown({ onComplete: cb }),
      { initialProps: { cb: onCompleteA } }
    );

    act(() => {
      result.current.startCountdown(3);
    });

    // Advance near completion (just before the last tick)
    act(() => {
      jest.advanceTimersByTime(2900);
    });

    // Swap callback while countdown is still active (count=1)
    rerender({ cb: onCompleteB });

    // Finish countdown
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // New callback should be called, old one must NOT
    expect(onCompleteB).toHaveBeenCalledTimes(1);
    expect(onCompleteA).not.toHaveBeenCalled();
  });
});
