/**
 * Tests for useHistogramToggle hook — histogram visibility toggle and press-to-show behavior.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useHistogramToggle } from '../useHistogramToggle';

// Mock useHistogram
const mockCaptureHistogram = jest.fn();
jest.mock('../useHistogram', () => ({
  useHistogram: () => ({
    histogramData: new Array(256).fill(0.1),
    capture: mockCaptureHistogram,
  }),
}));

// Mock CameraView (expo-camera) to avoid native module issues
jest.mock('expo-camera', () => ({
  CameraView: jest.fn(),
}));

const createCameraRef = (): React.RefObject<any> => ({
  current: {
    takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///test.jpg' }),
  },
});

describe('useHistogramToggle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCaptureHistogram.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns showHistogram: false initially when initialShowHistogram=false', () => {
      const cameraRef = createCameraRef();
      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
      expect(result.current.showHistogram).toBe(false);
    });

    it('returns showHistogram: true initially when initialShowHistogram=true', () => {
      const cameraRef = createCameraRef();
      const { result } = renderHook(() => useHistogramToggle(cameraRef, true));
      expect(result.current.showHistogram).toBe(true);
    });

    it('returns histogramData from useHistogram', () => {
      const cameraRef = createCameraRef();
      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
      expect(result.current.histogramData).toBeDefined();
      expect(result.current.histogramData.length).toBe(256);
    });

    it('returns all required handlers', () => {
      const cameraRef = createCameraRef();
      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
      expect(result.current).toHaveProperty('handleHistogramToggle');
      expect(result.current).toHaveProperty('handleHistogramPressIn');
      expect(result.current).toHaveProperty('handleHistogramPressOut');
    });
  });

  describe('handleHistogramToggle', () => {
    it('calls captureHistogram then sets showHistogram to true when showHistogram is false', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      expect(result.current.showHistogram).toBe(false);

      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(mockCaptureHistogram).toHaveBeenCalledTimes(1);
      expect(mockCaptureHistogram).toHaveBeenCalledWith(cameraRef);
      expect(result.current.showHistogram).toBe(true);
    });

    it('sets showHistogram to false without calling captureHistogram when showHistogram is true', async () => {
      const cameraRef = createCameraRef();
      const { result } = renderHook(() => useHistogramToggle(cameraRef, true));

      expect(result.current.showHistogram).toBe(true);
      mockCaptureHistogram.mockClear();

      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(mockCaptureHistogram).not.toHaveBeenCalled();
      expect(result.current.showHistogram).toBe(false);
    });

    it('starts a 5000ms auto-hide timer after toggling on', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(true);

      // Before timer fires — should still be visible
      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(result.current.showHistogram).toBe(true);

      // After 5000ms — should auto-hide
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.showHistogram).toBe(false);
    });

    it('clears any existing timer before setting a new one on toggle-on', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      // First toggle on — starts a 5000ms timer
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(true);

      // Toggle off before timer fires
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(false);

      // Toggle on again — should start a new 5000ms timer
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(true);

      // The old timer from the first toggle should not fire
      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(result.current.showHistogram).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.showHistogram).toBe(false);
    });
  });

  describe('handleHistogramPressIn', () => {
    it('clears any existing timer', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      // Toggle on to start a 5000ms timer
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      expect(result.current.showHistogram).toBe(true);

      // Press in — should clear the 5000ms timer
      await act(async () => {
        await result.current.handleHistogramPressIn();
      });

      // The original 5000ms timer should not fire
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.showHistogram).toBe(true);
    });

    it('captures histogram via captureHistogram', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      await act(async () => {
        await result.current.handleHistogramPressIn();
      });

      expect(mockCaptureHistogram).toHaveBeenCalledTimes(1);
      expect(mockCaptureHistogram).toHaveBeenCalledWith(cameraRef);
    });

    it('sets showHistogram to true', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      expect(result.current.showHistogram).toBe(false);

      await act(async () => {
        await result.current.handleHistogramPressIn();
      });

      expect(result.current.showHistogram).toBe(true);
    });
  });

  describe('handleHistogramPressOut', () => {
    it('clears the 5000ms timer and starts a new 2000ms timer', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      // Toggle on to start a 5000ms timer
      await act(async () => {
        await result.current.handleHistogramToggle();
      });

      // Press out — clears the 5000ms timer and starts a 2000ms timer
      await act(async () => {
        await result.current.handleHistogramPressOut();
      });

      // The 2000ms timer fires at t=2000 (within the 5000ms advance), setting showHistogram to false
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.showHistogram).toBe(false);
    });

    it('sets a new timer that hides showHistogram after 2000ms', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, true));

      expect(result.current.showHistogram).toBe(true);

      await act(async () => {
        await result.current.handleHistogramPressOut();
      });

      // Before 2000ms — should still be visible
      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(result.current.showHistogram).toBe(true);

      // At 2000ms — should hide
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.showHistogram).toBe(false);
    });

    it('does NOT call captureHistogram', async () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result } = renderHook(() => useHistogramToggle(cameraRef, false));

      await act(async () => {
        await result.current.handleHistogramPressOut();
      });

      expect(mockCaptureHistogram).not.toHaveBeenCalled();
    });
  });

  describe('useEffect cleanup', () => {
    it('clears the timer when component unmounts', () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result, unmount } = renderHook(() => useHistogramToggle(cameraRef, false));

      // Toggle on to start a 5000ms timer
      act(() => {
        result.current.handleHistogramToggle();
      });

      // Unmount before timer fires — should not throw
      expect(() => unmount()).not.toThrow();

      // Advancing timers after unmount should not cause issues
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    });

    it('clears the press-out timer (2000ms) on unmount', () => {
      const cameraRef = createCameraRef();
      mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.1));

      const { result, unmount } = renderHook(() => useHistogramToggle(cameraRef, true));

      act(() => {
        result.current.handleHistogramPressOut();
      });

      expect(() => unmount()).not.toThrow();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
    });
  });
});
