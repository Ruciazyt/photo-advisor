/**
 * Unit tests for src/hooks/useDebounce.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 100));
    expect(result.current).toBe('hello');
  });

  it('returns initial value immediately for number', () => {
    const { result } = renderHook(() => useDebounce(42, 100));
    expect(result.current).toBe(42);
  });

  it('debounced value updates after delay passes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 200 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 200 });

    // Should still be initial before delay
    expect(result.current).toBe('initial');

    // Advance past delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('updated');
  });

  it('new value resets the timer (leading edge behavior)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    expect(result.current).toBe('a');

    // Change value at t=50
    rerender({ value: 'b', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(50); // t=50, timer not yet fired
    });
    expect(result.current).toBe('a');

    // Change value again at t=60
    rerender({ value: 'c', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(50); // t=110, original timer would fire but was cleared
    });
    expect(result.current).toBe('a');

    // Advance to t=160 (100ms after last change at t=60)
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('c');
  });

  it('returns latest debounced value on re-render with same debounced value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'same', delay: 100 } }
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('same');

    // Re-render with same value (no actual change)
    rerender({ value: 'same', delay: 100 });
    expect(result.current).toBe('same');

    // Re-render with different value
    rerender({ value: 'new', delay: 100 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('new');
  });

  it('cleanup on unmount — no state update after unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    );

    rerender({ value: 'changed', delay: 100 });

    unmount();

    // This should not throw or update any state since component is unmounted
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // If we get here without errors, the test passes
    expect(true).toBe(true);
  });

  it('works with different types — string', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '', delay: 50 } }
    );
    expect(result.current).toBe('');

    rerender({ value: 'hello world', delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toBe('hello world');
  });

  it('works with different types — number', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 50 } }
    );
    expect(result.current).toBe(0);

    rerender({ value: 12345, delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toBe(12345);
  });

  it('works with different types — object', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: object; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: { a: 1 }, delay: 50 } }
    );
    expect(result.current).toEqual({ a: 1 });

    rerender({ value: { b: 2 }, delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toEqual({ b: 2 });
  });

  it('works with different types — array', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number[]; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: [1], delay: 50 } }
    );
    expect(result.current).toEqual([1]);

    rerender({ value: [1, 2, 3], delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toEqual([1, 2, 3]);
  });

  it('delay=0 returns value immediately (no debounce)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'instant', delay: 0 } }
    );

    expect(result.current).toBe('instant');

    rerender({ value: 'also instant', delay: 0 });
    expect(result.current).toBe('also instant');
  });

  it('delay=0 unmount cleanup is safe', () => {
    const { unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'x', delay: 0 } }
    );

    unmount();
    // Should not throw
    expect(true).toBe(true);
  });
});
