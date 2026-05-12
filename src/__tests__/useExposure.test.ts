/**
 * Tests for useExposure hook
 * Covers: initial state, setting exposure compensation, polling, defensive handling,
 * min/max exposure range
 */

jest.mock('react-native-reanimated', () => {
  const mockUseFrameCallbackFn = jest.fn();
  return {
    useFrameCallback: mockUseFrameCallbackFn,
    runOnJS: (fn: () => void) => fn,
  };
});

import { renderHook, act } from '@testing-library/react-native';
import { useExposure } from '../hooks/useExposure';

// ---------------------------------------------------------------------------
// Mock useAnimationFrameTimer to capture poll callbacks
// ---------------------------------------------------------------------------
const sharedPollCallbacks: Array<() => void> = [];

jest.mock('../hooks/useAnimationFrameTimer', () => {
  const original = jest.requireActual('../hooks/useAnimationFrameTimer');
  return {
    ...original,
    useAnimationFrameTimer: jest.fn((options: {
      intervalMs: number;
      onTick: () => void;
      enabled: boolean;
    }) => {
      if (options.enabled) {
        sharedPollCallbacks.push(options.onTick);
      }
      return {};
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCamera(overrides: Record<string, unknown> = {}) {
  return {
    exposureCompensation: 0,
    minExposureCompensation: -2,
    maxExposureCompensation: 2,
    setExposureCompensation: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useExposure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with exposureComp=0', () => {
      const cameraRef = { current: makeMockCamera({ exposureCompensation: 0 }) };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('starts with default minEC=-2 and maxEC=2', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('starts with isAdjusting=false', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.isAdjusting).toBe(false);
    });

    it('reads initial values from camera synchronously', () => {
      const cameraRef = { current: makeMockCamera({ exposureCompensation: 1.5 }) };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(1.5);
    });
  });

  describe('setExposureCompensation', () => {
    it('calls camera.setExposureCompensation with the given value', async () => {
      const mockCam = makeMockCamera();
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      expect(mockCam.setExposureCompensation).toHaveBeenCalledWith(1.0);
    });

    it('updates local exposureComp state after successful call', async () => {
      const mockCam = makeMockCamera({ exposureCompensation: 0 });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(-1.5);
      });

      expect(result.current.exposureComp).toBe(-1.5);
    });

    it('does not throw when cameraRef.current is null', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      // Should not throw — defensive handling
      expect(result.current.isAdjusting).toBe(false);
    });

    it('does not throw when cameraRef.current is undefined', async () => {
      const cameraRef = { current: undefined };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('clears isAdjusting even if setExposureCompensation throws', async () => {
      const mockCam = makeMockCamera({
        setExposureCompensation: jest.fn().mockRejectedValue(new Error('Camera error')),
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0).catch(() => {});
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('does not call setExposureCompensation when camera does not expose the method', async () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).setExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      // Should not throw; exposureComp stays at the initial value (0)
      expect(result.current.exposureComp).toBe(0);
    });
  });

  describe('polling mechanism', () => {
    it('registers useAnimationFrameTimer on mount', () => {
      const { useAnimationFrameTimer } = require('../hooks/useAnimationFrameTimer');
      const cameraRef = { current: makeMockCamera() };
      renderHook(() => useExposure(cameraRef as any));
      expect(useAnimationFrameTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          intervalMs: 500,
          enabled: true,
        })
      );
    });

    it('registers useAnimationFrameTimer even when cameraRef.current is null', () => {
      const { useAnimationFrameTimer } = require('../hooks/useAnimationFrameTimer');
      const cameraRef = { current: null };
      renderHook(() => useExposure(cameraRef as any));
      expect(useAnimationFrameTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          intervalMs: 500,
          enabled: true,
        })
      );
    });

    it('updates exposureComp state when poll callback is invoked', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 0 });
      const cameraRef = { current: mockCam };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);

      // Simulate camera value changing and trigger poll
      mockCam.exposureCompensation = 1.5;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      expect(result.current.exposureComp).toBe(1.5);
    });

    it('updates minEC and maxEC state when poll callback is invoked with new range', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: -2, maxExposureCompensation: 2 });
      const cameraRef = { current: mockCam };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);

      // Simulate camera range changing and trigger poll
      mockCam.minExposureCompensation = -3;
      mockCam.maxExposureCompensation = 4;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      expect(result.current.minEC).toBe(-3);
      expect(result.current.maxEC).toBe(4);
    });

    it('does not update state when cameraRef.current becomes null during poll', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 1 });
      const cameraRef = { current: mockCam };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(1);

      // Simulate camera becoming unavailable
      cameraRef.current = null;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      // State should remain at last known value
      expect(result.current.exposureComp).toBe(1);
    });
  });

  describe('isAdjusting state', () => {
    it('isAdjusting is true during the async setExposureCompensation call', async () => {
      jest.useFakeTimers();
      const mockCam = makeMockCamera({
        setExposureCompensation: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        }),
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.isAdjusting).toBe(false);

      act(() => {
        result.current.setExposureCompensation(1.0);
      });

      // Advance timers to let the promise resolve, but keep promise pending
      act(() => {
        jest.advanceTimersByTime(5); // Before camera method resolves
      });

      // isAdjusting should be true during the async operation
      expect(result.current.isAdjusting).toBe(true);

      // Complete the promise
      await act(async () => {
        jest.advanceTimersByTime(10);
        await Promise.resolve();
      });

      expect(result.current.isAdjusting).toBe(false);

      jest.useRealTimers();
    });

    it('isAdjusting transitions from true to false even if camera method is missing', async () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).setExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.isAdjusting).toBe(false);

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      // isAdjusting returns to false after the guard check
      expect(result.current.isAdjusting).toBe(false);
    });
  });

  describe('defensive handling when camera does not support exposure', () => {
    it('does not crash when camera.exposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).exposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      // Should initialise with defaults without crashing
      expect(result.current.exposureComp).toBe(0);
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('does not crash when camera.minExposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).minExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('does not crash when camera.maxExposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).maxExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('does not crash when camera is a plain object without any exposure props', () => {
      const cameraRef = { current: {} };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('ignores non-numeric exposureCompensation values', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 'not a number' as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('ignores non-numeric minExposureCompensation values', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: null as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
    });

    it('ignores non-numeric maxExposureCompensation values', () => {
      const mockCam = makeMockCamera({ maxExposureCompensation: null as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.maxEC).toBe(2);
    });
  });

  describe('min/max exposure range', () => {
    it('accepts camera-reported minEC and maxEC', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: -3,
        maxExposureCompensation: 3,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-3);
      expect(result.current.maxEC).toBe(3);
    });

    it('handles asymmetric ranges', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: -1,
        maxExposureCompensation: 4,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-1);
      expect(result.current.maxEC).toBe(4);
    });

    it('uses default range when camera returns NaN', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: NaN,
        maxExposureCompensation: NaN,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('accepts raw values when camera min > max (nonsense data)', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: 5,
        maxExposureCompensation: -3,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(5);
      expect(result.current.maxEC).toBe(-3);
    });
  });

  describe('returned API shape', () => {
    it('returns all required fields', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current).toHaveProperty('exposureComp');
      expect(result.current).toHaveProperty('minEC');
      expect(result.current).toHaveProperty('maxEC');
      expect(result.current).toHaveProperty('setExposureCompensation');
      expect(result.current).toHaveProperty('isAdjusting');
    });

    it('setExposureCompensation is a function', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(typeof result.current.setExposureCompensation).toBe('function');
    });
  });
});
