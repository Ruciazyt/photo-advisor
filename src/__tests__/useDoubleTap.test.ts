/**
 * Unit tests for src/hooks/useDoubleTap.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useDoubleTap } from '../hooks/useDoubleTap';

describe('useDoubleTap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fire callback on a single press', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap));

    act(() => {
      result.current();
    });

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('does not fire callback when two presses are too far apart (beyond delay)', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

    act(() => {
      result.current();
      jest.advanceTimersByTime(400);
      result.current();
    });

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('fires callback when two presses happen within delay window', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

    act(() => {
      result.current();
      jest.advanceTimersByTime(150);
      result.current();
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('fires callback only once for a double-tap (not on subsequent taps)', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

    act(() => {
      result.current();
      jest.advanceTimersByTime(150);
      result.current(); // fires callback
      // third tap — ref was reset to 0; delta = elapsed time since last, likely > 300
      jest.advanceTimersByTime(500);
      result.current();
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('uses custom delay', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, 500));

    act(() => {
      result.current();
      jest.advanceTimersByTime(400);
      result.current(); // within 500ms → fires
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('fires when second tap is exactly 1ms before delay boundary', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

    act(() => {
      result.current();
      jest.advanceTimersByTime(299);
      result.current();
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });
});
