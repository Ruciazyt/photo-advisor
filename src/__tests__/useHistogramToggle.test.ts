/**
 * Tests for useHistogramToggle — histogram display toggle with auto-hide timers.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useHistogramToggle } from '../hooks/useHistogramToggle';

// Mock useHistogram
const mockCapture = jest.fn().mockResolvedValue(new Array(256).fill(0.5));
jest.mock('../hooks/useHistogram', () => ({
  useHistogram: jest.fn(() => ({
    histogramData: new Array(256).fill(0.5),
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

  describe('initial state', () => {
    it('starts with showHistogram false', () => {
      const { result } = renderHook(() =>
        useHistogramToggle({ current: null } as any)
      );
      expect(result.current.showHistogram).toBe(false);
    });

    it('returns histogramData from useHistogram', () => {
      const { result } = renderHook(() =>
        useHistogramToggle({ current: null } as any)
      );
      expect(result.current.histogramData).toHaveLength(256);
    });
  });

  describe('handleHistogramToggle', () => {
    it('hides histogram when already showing', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef as any)
      );

      // Show it first via handleHistogramToggle
      await act(async () => {
        await result.current.handleHistogramToggle();
      });
      expect(result.current.showHistogram).toBe(true);

      // Toggle again should hide (synchronous — hide branch)
      act(() => {
        result.current.handleHistogramToggle();
      });
      expect(result.current.showHistogram).toBe(false);
    });

    it('shows histogram and schedules auto-hide when hidden', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef as any)
      );

      expect(result.current.showHistogram).toBe(false);

      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(true);
      // Auto-hide should be scheduled for 5000ms
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.showHistogram).toBe(false);
    });

    it('clears previous timer when toggling on again', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef as any)
      );

      await act(async () => {
        await result.current.handleHistogramToggle();
      });
      expect(result.current.showHistogram).toBe(true);

      // Toggle off
      act(() => {
        result.current.handleHistogramToggle();
      });
      expect(result.current.showHistogram).toBe(false);

      // Toggle on again — should get a new timer
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      // Advance only 3000ms — should still be visible (new 5000ms timer)
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.showHistogram).toBe(true);

      // Advance to total 5000ms from last show
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.showHistogram).toBe(false);
    });
  });

  describe('handleHistogramPressIn', () => {
    it('shows histogram after press in', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef as any)
      );

      await act(async () => {
        await result.current.handleHistogramPressIn();
      });
      expect(result.current.showHistogram).toBe(true);
    });

    it('calls captureHistogram on press in', async () => {
      const cameraRef = { current: 'camera-instance' } as any;
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef)
      );

      await act(async () => {
        await result.current.handleHistogramPressIn();
      });

      expect(mockCapture).toHaveBeenCalledWith(cameraRef);
    });
  });

  describe('handleHistogramPressOut', () => {
    it('schedules 2000ms auto-hide after press out', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() =>
        useHistogramToggle(cameraRef as any)
      );

      await act(async () => {
        await result.current.handleHistogramToggle();
      });
      expect(result.current.showHistogram).toBe(true);

      act(() => {
        result.current.handleHistogramPressOut();
      });

      // 1999ms — still visible
      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(result.current.showHistogram).toBe(true);

      // 2000ms — now hidden
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.showHistogram).toBe(false);
    });
  });
});
