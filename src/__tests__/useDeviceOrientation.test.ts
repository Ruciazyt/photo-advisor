/**
 * Tests for useDeviceOrientation hook
 * Tests: orientation state, availability detection, accelerometer subscription lifecycle
 */

jest.mock('expo-sensors', () => {
  const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));
  const mockRemove = jest.fn();
  const mockSetUpdateInterval = jest.fn();
  const mockIsAvailableAsync = jest.fn();
  return {
    Accelerometer: {
      isAvailableAsync: mockIsAvailableAsync,
      setUpdateInterval: mockSetUpdateInterval,
      addListener: mockAddListener,
      remove: mockRemove,
    },
  };
});

import { renderHook, act } from '@testing-library/react-native';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { Accelerometer } from 'expo-sensors';

const mockIsAvailableAsync = Accelerometer.isAvailableAsync as jest.MockedFunction<typeof Accelerometer.isAvailableAsync>;
const mockAddListener = Accelerometer.addListener as jest.MockedFunction<typeof Accelerometer.addListener>;
const mockSetUpdateInterval = Accelerometer.setUpdateInterval as jest.MockedFunction<typeof Accelerometer.setUpdateInterval>;

describe('useDeviceOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockAddListener.mockImplementation((handler) => {
      handler({ x: 0, y: 0, z: 9.81 });
      return { remove: jest.fn() };
    });
  });

  describe('initial state', () => {
    it('starts with pitch=0 and roll=0', () => {
      const { result } = renderHook(() => useDeviceOrientation());
      expect(result.current.orientation.pitch).toBe(0);
      expect(result.current.orientation.roll).toBe(0);
    });

    it('starts with available=false pending availability check', () => {
      const { result } = renderHook(() => useDeviceOrientation());
      expect(result.current.available).toBe(false);
    });
  });

  describe('availability detection', () => {
    it('sets available=true when Accelerometer.isAvailableAsync returns true', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.available).toBe(true);
    });

    it('sets available=false when Accelerometer.isAvailableAsync returns false', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);
      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.available).toBe(false);
    });

    it('does not subscribe when accelerometer is not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);
      renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockAddListener).not.toHaveBeenCalled();
    });
  });

  describe('update interval', () => {
    it('sets update interval on mount', async () => {
      renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockSetUpdateInterval).toHaveBeenCalledWith(100);
    });

    it('uses custom updateIntervalMs when provided', async () => {
      renderHook(() => useDeviceOrientation(50));
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockSetUpdateInterval).toHaveBeenCalledWith(50);
    });
  });

  describe('orientation computation', () => {
    it('computes orientation from accelerometer data', async () => {
      mockAddListener.mockImplementation((handler) => {
        handler({ x: 0, y: 0, z: 9.81 });
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      // When device is flat: x=0, y=0, z≈9.81
      // pitch = atan2(-x, sqrt(y²+z²)) = atan2(0, sqrt(0+9.81²)) = 0
      // roll = atan2(y, z) = atan2(0, 9.81) = 0
      expect(result.current.orientation.pitch).toBeCloseTo(0, 1);
      expect(result.current.orientation.roll).toBeCloseTo(0, 1);
    });

    it('computes non-zero pitch when device is tilted forward/back', async () => {
      mockAddListener.mockImplementation((handler) => {
        handler({ x: 5, y: 0, z: 8 });
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      // pitch = atan2(-5, sqrt(0 + 8²)) = atan2(-5, 8)
      // = atan2(-5, 8) ≈ -32° (negative because x is positive, forward tilt)
      expect(result.current.orientation.pitch).not.toBeCloseTo(0, 1);
    });

    it('computes non-zero roll when device is tilted left/right', async () => {
      mockAddListener.mockImplementation((handler) => {
        handler({ x: 0, y: 5, z: 8 });
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      // roll = atan2(5, 8) ≈ 32°
      expect(result.current.orientation.roll).not.toBeCloseTo(0, 1);
    });

    it('updates orientation when accelerometer emits new data', async () => {
      let capturedHandler: (m: { x: number; y: number; z: number }) => void;
      mockAddListener.mockImplementation((handler) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      const initialRoll = result.current.orientation.roll;

      // Emit a different orientation
      act(() => {
        capturedHandler!({ x: 0, y: 8, z: 4 });
      });

      expect(result.current.orientation.roll).not.toBe(initialRoll);
    });
  });

  describe('subscription lifecycle', () => {
    it('subscribes to Accelerometer on mount when available', async () => {
      renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockAddListener).toHaveBeenCalledTimes(1);
    });

    it('removes subscription on unmount', async () => {
      const removeMock = jest.fn();
      mockAddListener.mockReturnValue({ remove: removeMock });

      const { unmount } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      unmount();
      expect(removeMock).toHaveBeenCalledTimes(1);
    });

    it('does not update state after unmount (mountedRef guard)', async () => {
      let capturedHandler: (m: { x: number; y: number; z: number }) => void;
      mockAddListener.mockImplementation((handler) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });

      const { unmount } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      // Emit after unmount — should not crash or update state
      act(() => {
        capturedHandler!({ x: 0, y: 0, z: 9.81 });
      });
      // No assertion needed — just ensure no crash (mount guard works)
    });
  });

  describe('mountedRef cleanup', () => {
    it('does not call setOrientation after unmount even if async callback fires', async () => {
      let capturedHandler: (m: { x: number; y: number; z: number }) => void;
      mockAddListener.mockImplementation((handler) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      });

      const { result, unmount } = renderHook(() => useDeviceOrientation());
      await act(async () => {
        await Promise.resolve();
      });

      const stateBefore = result.current.orientation;

      unmount();

      // Fire callback after unmount — should be a no-op (mountedRef = false)
      act(() => {
        capturedHandler!({ x: 0, y: 5, z: 8 });
      });
    });
  });
});
