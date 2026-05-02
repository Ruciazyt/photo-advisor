import { act, renderHook } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 100));
    expect(result.current).toBe('hello');
  });

  it('debounces updates by the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    expect(result.current).toBe('a');

    act(() => {
      rerender({ value: 'b', delay: 100 });
    });
    expect(result.current).toBe('a'); // still debouncing

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('b');
  });

  it('resets timer when value changes before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    act(() => {
      rerender({ value: 'b', delay: 100 });
    });
    expect(result.current).toBe('a');

    act(() => {
      rerender({ value: 'c', delay: 100 });
    });
    expect(result.current).toBe('a'); // timer reset

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('c');
  });

  it('returns immediately when delay=0', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 0 } }
    );

    expect(result.current).toBe('a');

    act(() => {
      rerender({ value: 'b', delay: 0 });
    });
    expect(result.current).toBe('b');
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('value', 100));
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 1, delay: 50 } }
    );

    expect(result.current).toBe(1);

    act(() => {
      rerender({ value: 2, delay: 50 });
    });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).toBe(2);
  });

  it('debounces back-to-back rapid changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 50 } }
    );

    act(() => {
      rerender({ value: 'b', delay: 50 });
    });
    act(() => {
      rerender({ value: 'c', delay: 50 });
    });
    act(() => {
      rerender({ value: 'd', delay: 50 });
    });

    expect(result.current).toBe('a'); // none fired yet

    act(() => {
      jest.advanceTimersByTime(30);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(result.current).toBe('d');
  });

  it('unmounting mid-debounce cleans up the timer', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => useDebounce('a', 100));

    act(() => {
      result.current; // reference just to show we're using it
    });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});