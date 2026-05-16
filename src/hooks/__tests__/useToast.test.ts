/**
 * Tests for useToast hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it('returns initial empty message and opacity 0', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toastMessage).toBe('');
    expect(result.current.opacity).toBeDefined(); // SharedValue
  });

  it('shows toast message immediately when showToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Hello World');
    });

    expect(result.current.toastMessage).toBe('Hello World');
  });

  it('clears message and fades out after timeout', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Temporary');
    });

    expect(result.current.toastMessage).toBe('Temporary');

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.toastMessage).toBe('');
  });

  it('resets timer when showToast is called again before timeout', () => {
    const { result, rerender } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First');
    });
    expect(result.current.toastMessage).toBe('First');

    act(() => {
      jest.advanceTimersByTime(500); // 700ms remaining
    });
    expect(result.current.toastMessage).toBe('First');

    act(() => {
      result.current.showToast('Second');
    });
    expect(result.current.toastMessage).toBe('Second');

    act(() => {
      jest.advanceTimersByTime(700); // only 700ms, not enough for second toast
    });
    expect(result.current.toastMessage).toBe('Second');

    act(() => {
      jest.advanceTimersByTime(500); // total 1200ms from 'Second'
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('clears previous timeout when showToast is called again', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First');
    });

    act(() => {
      jest.advanceTimersByTime(1100); // almost full duration
    });

    act(() => {
      result.current.showToast('Second'); // reset before first fires
    });

    // First toast should have been cancelled, second toast should still be showing
    expect(result.current.toastMessage).toBe('Second');

    act(() => {
      jest.advanceTimersByTime(1199); // not enough for second
    });
    expect(result.current.toastMessage).toBe('Second');

    act(() => {
      jest.advanceTimersByTime(1); // now 1200ms total
    });
    expect(result.current.toastMessage).toBe('');
  });
});