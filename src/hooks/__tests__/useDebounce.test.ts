/**
 * Tests for useDebounce hook — delayed value updates.
 * Follows the same patterns as the existing src/__tests__/useDebounce.test.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('debounced value updates after delay passes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 200 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 200 });
    expect(result.current).toBe('initial'); // still old before delay

    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current).toBe('updated');
  });

  it('new value resets the timer', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    expect(result.current).toBe('a');

    rerender({ value: 'b', delay: 100 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toBe('a');

    rerender({ value: 'c', delay: 100 });
    act(() => { jest.advanceTimersByTime(50); }); // original timer would fire but was cleared
    expect(result.current).toBe('a');

    act(() => { jest.advanceTimersByTime(50); }); // now 100ms from 'c'
    expect(result.current).toBe('c');
  });

  it('returns latest debounced value on re-render with same value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'same', delay: 100 } }
    );

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current).toBe('same');

    rerender({ value: 'same', delay: 100 });
    expect(result.current).toBe('same');

    rerender({ value: 'new', delay: 100 });
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current).toBe('new');
  });

  it('cleanup on unmount does not throw', () => {
    const { rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    );

    rerender({ value: 'changed', delay: 100 });
    unmount();

    act(() => { jest.advanceTimersByTime(200); });
    expect(true).toBe(true); // no crash = pass
  });

  it('works with number type', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 50 } }
    );
    expect(result.current).toBe(0);

    rerender({ value: 12345, delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toBe(12345);
  });

  it('works with object type', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: object; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: { a: 1 }, delay: 50 } }
    );
    expect(result.current).toEqual({ a: 1 });

    rerender({ value: { b: 2 }, delay: 50 });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toEqual({ b: 2 });
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
    expect(true).toBe(true); // no crash
  });

  it('multiple rapid changes result in last value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    rerender({ value: 'b', delay: 100 });
    rerender({ value: 'c', delay: 100 });
    rerender({ value: 'd', delay: 100 });

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current).toBe('d');
  });

  it('debounce with delay=200 works correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'start', delay: 200 } }
    );

    expect(result.current).toBe('start');

    rerender({ value: 'middle', delay: 200 });
    act(() => { jest.advanceTimersByTime(199); });
    expect(result.current).toBe('start');

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe('middle');
  });
});