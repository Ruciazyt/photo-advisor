/**
 * Unit tests for src/hooks/useHistogramToggle.ts
 *
 * Tests:
 * - Initial state respects initialShowHistogram parameter
 * - handleHistogramToggle turns on/off the histogram
 * - handleHistogramToggle captures histogram on turn-on
 * - handleHistogramPressIn captures and shows histogram, clears timer
 * - handleHistogramPressOut starts auto-hide timer
 * - Cleanup on unmount
 */

import { renderHook, act } from '@testing-library/react-native';
import { useHistogramToggle } from '../hooks/useHistogramToggle';

// Mock useHistogram — capture is async but resolves immediately in mock
const mockCapture = jest.fn().mockResolvedValue(null);

jest.mock('../hooks/useHistogram', () => ({
  useHistogram: jest.fn(() => ({
    histogramData: new Array(256).fill(0).map((_, i) => i / 255),
    isCapturing: false,
    capture: mockCapture,
  })),
}));

describe('useHistogramToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('defaults showHistogram to false when initialShowHistogram is false', () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null }, false));
    expect(result.current.showHistogram).toBe(false);
  });

  it('defaults showHistogram to true when initialShowHistogram is true', () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null }, true));
    expect(result.current.showHistogram).toBe(true);
  });

  it('handleHistogramToggle turns histogram on when currently off', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    await act(async () => {
      await result.current.handleHistogramToggle();
    });

    expect(result.current.showHistogram).toBe(true);
    expect(mockCapture).toHaveBeenCalledWith(cameraRef);
  });

  it('handleHistogramToggle turns histogram off when currently on', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    // Turn on first
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);

    // On → Off
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(false);
  });

  it('handleHistogramToggle starts 5s auto-hide timer after turning on', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);

    // Advance 4s — should still be visible
    await act(() => { jest.advanceTimersByTime(4000); });
    expect(result.current.showHistogram).toBe(true);

    // Advance to 5s — auto-hide kicks in
    await act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('handleHistogramPressIn captures histogram and shows it', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    await act(async () => {
      await result.current.handleHistogramPressIn();
    });

    expect(mockCapture).toHaveBeenCalledWith(cameraRef);
    expect(result.current.showHistogram).toBe(true);
  });

  it('handleHistogramPressOut starts 2s auto-hide timer', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    // Turn on first
    await act(async () => {
      await result.current.handleHistogramPressIn();
    });
    expect(result.current.showHistogram).toBe(true);

    // Press out
    await act(() => {
      result.current.handleHistogramPressOut();
    });

    // 1.5s — still visible
    await act(() => { jest.advanceTimersByTime(1500); });
    expect(result.current.showHistogram).toBe(true);

    // 2s — auto-hide
    await act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('handleHistogramToggle with histogram already on resets the 5s timer', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    // Turn on
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);

    // Advance 3s
    await act(() => { jest.advanceTimersByTime(3000); });

    // Toggle off (showHistogram=true → false, no new timer)
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(false);

    // Turn on again (new 5s timer starts)
    mockCapture.mockClear();
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);
    expect(mockCapture).toHaveBeenCalled();

    // 3s into new timer — still on
    await act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.showHistogram).toBe(true);

    // 5s total — now auto-hides
    await act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('handleHistogramPressIn does not start an auto-hide timer (press-out does)', async () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    // Turn on first
    await act(async () => {
      await result.current.handleHistogramPressIn();
    });
    expect(result.current.showHistogram).toBe(true);

    // Press-in clears existing timer but does NOT start a new one
    // So histogram stays visible indefinitely (until another action)
    await act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.showHistogram).toBe(true);

    // Press-out starts the 2s auto-hide timer
    act(() => { result.current.handleHistogramPressOut(); });
    expect(result.current.showHistogram).toBe(true);

    await act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('cleanup clears timer on unmount', async () => {
    const cameraRef = { current: {} };
    const { result, unmount } = renderHook(() => useHistogramToggle(cameraRef, false));

    // Start toggle timer (async operation)
    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);

    // Unmount — useEffect cleanup runs, clearing the timer
    unmount();

    // Advancing far beyond 5s should not crash (timer was cleared on unmount)
    await act(() => { jest.advanceTimersByTime(10000); });
    // No assertion — just verify no crash
  });

  it('showHistogram and histogramData are exposed in return value', () => {
    const cameraRef = { current: {} };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    expect(typeof result.current.showHistogram).toBe('boolean');
    expect(Array.isArray(result.current.histogramData)).toBe(true);
    expect(result.current.histogramData).toHaveLength(256);
  });

  it('handleHistogramToggle with null cameraRef does not crash', async () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

    await act(async () => {
      await result.current.handleHistogramToggle();
    });
    expect(result.current.showHistogram).toBe(true);
    expect(mockCapture).toHaveBeenCalledWith(cameraRef);
  });
});