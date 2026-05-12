/**
 * Unit tests for src/hooks/useExposure.ts
 *
 * Covers:
 * - initial state reading from cameraRef.current (exposureComp, minEC, maxEC)
 * - setExposureCompensation: calls camera method, updates local state
 * - polling via useAnimationFrameTimer (500ms interval)
 * - isAdjusting state during async operations
 * - defensive defaults when camera doesn't expose exposure properties
 * - returned API shape
 */

import { renderHook, act } from '@testing-library/react-native';
import { useExposure } from '../useExposure';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated (required by useAnimationFrameTimer)
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () => {
  const mockUseFrameCallbackFn = jest.fn();
  return {
    useFrameCallback: mockUseFrameCallbackFn,
    runOnJS: (fn: () => void) => fn,
  };
});

// ---------------------------------------------------------------------------
// Mock useAnimationFrameTimer to capture registered poll callbacks
// ---------------------------------------------------------------------------
const sharedPollCallbacks: Array<() => void> = [];

jest.mock('../useAnimationFrameTimer', () => {
  return {
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
// Helper: build a minimal mock camera object
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
    sharedPollCallbacks.length = 0;
  });

  // ---------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with exposureComp=0 when camera has default value', () => {
      const cameraRef = { current: makeMockCamera({ exposureCompensation: 0 }) };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('reads initial exposureComp from camera synchronously on mount', () => {
      const cameraRef = { current: makeMockCamera({ exposureCompensation: 1.5 }) };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(1.5);
    });

    it('starts with minEC=-2 and maxEC=2 defaults', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('reads minEC and maxEC from camera on mount', () => {
      const cameraRef = {
        current: makeMockCamera({ minExposureCompensation: -3, maxExposureCompensation: 4 }),
      };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-3);
      expect(result.current.maxEC).toBe(4);
    });

    it('starts with isAdjusting=false', () => {
      const cameraRef = { current: makeMockCamera() };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.isAdjusting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // setExposureCompensation
  // ---------------------------------------------------------------------
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

      // Should not throw; no camera call made
      expect(result.current.isAdjusting).toBe(false);
    });

    it('does not throw when camera lacks setExposureCompensation method', async () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).setExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });

      // Should guard against missing method; exposureComp stays at initial value
      expect(result.current.exposureComp).toBe(0);
    });

    it('sets isAdjusting=true during the async call and false after', async () => {
      jest.useFakeTimers();
      const mockCam = makeMockCamera({
        setExposureCompensation: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        }),
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.isAdjusting).toBe(false);

      act(() => {
        result.current.setExposureCompensation(1.0);
      });

      // Advance timers partially to let the promise start
      act(() => {
        jest.advanceTimersByTime(5);
      });
      expect(result.current.isAdjusting).toBe(true);

      // Complete the promise
      act(() => {
        jest.advanceTimersByTime(20);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isAdjusting).toBe(false);

      jest.useRealTimers();
    });

    it('isAdjusting returns to false even when setExposureCompensation throws', async () => {
      const mockCam = makeMockCamera({
        setExposureCompensation: jest.fn().mockRejectedValue(new Error('camera_error')),
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      await act(async () => {
        await result.current.setExposureCompensation(1.0).catch(() => {});
      });

      expect(result.current.isAdjusting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // Polling via useAnimationFrameTimer
  // ---------------------------------------------------------------------
  describe('polling via useAnimationFrameTimer', () => {
    it('registers useAnimationFrameTimer with intervalMs=500 and enabled=true', () => {
      const { useAnimationFrameTimer } = require('../useAnimationFrameTimer');
      const cameraRef = { current: makeMockCamera() };
      renderHook(() => useExposure(cameraRef as any));

      expect(useAnimationFrameTimer).toHaveBeenCalledWith(
        expect.objectContaining({ intervalMs: 500, enabled: true })
      );
    });

    it('registers useAnimationFrameTimer even when cameraRef.current is null', () => {
      const { useAnimationFrameTimer } = require('../useAnimationFrameTimer');
      const cameraRef = { current: null };
      renderHook(() => useExposure(cameraRef as any));

      expect(useAnimationFrameTimer).toHaveBeenCalledWith(
        expect.objectContaining({ intervalMs: 500, enabled: true })
      );
    });

    it('poll callback updates exposureComp when camera value changes', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 0 });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.exposureComp).toBe(0);

      // Simulate camera exposure changing externally
      mockCam.exposureCompensation = 2;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      expect(result.current.exposureComp).toBe(2);
    });

    it('poll callback updates minEC and maxEC when camera range changes', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: -2, maxExposureCompensation: 2 });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);

      // Simulate camera exposing a new range
      mockCam.minExposureCompensation = -4;
      mockCam.maxExposureCompensation = 5;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      expect(result.current.minEC).toBe(-4);
      expect(result.current.maxEC).toBe(5);
    });

    it('poll callback is a no-op when cameraRef.current becomes null', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 1 });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      expect(result.current.exposureComp).toBe(1);

      // Camera becomes unavailable
      cameraRef.current = null;

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      // State stays at last known value
      expect(result.current.exposureComp).toBe(1);
    });

    it('poll callback does not crash when camera lacks exposure properties', () => {
      const cameraRef = { current: {} };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      act(() => {
        sharedPollCallbacks.forEach(cb => cb());
      });

      // Should not throw; defaults should be maintained
      expect(result.current.exposureComp).toBe(0);
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });
  });

  // ---------------------------------------------------------------------
  // Defensive defaults when camera lacks exposure support
  // ---------------------------------------------------------------------
  describe('defensive defaults for unsupported cameras', () => {
    it('uses default exposureComp=0 when camera.exposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).exposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('uses default minEC=-2 when camera.minExposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).minExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
    });

    it('uses default maxEC=2 when camera.maxExposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).maxExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.maxEC).toBe(2);
    });

    it('uses default minEC=-2, maxEC=2 when camera is a plain empty object', () => {
      const cameraRef = { current: {} };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('ignores non-numeric exposureCompensation values', () => {
      const mockCam = makeMockCamera({ exposureCompensation: 'bad' as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('ignores NaN exposureCompensation values', () => {
      const mockCam = makeMockCamera({ exposureCompensation: NaN });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('ignores Infinity exposureCompensation values', () => {
      const mockCam = makeMockCamera({ exposureCompensation: Infinity });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('accepts asymmetric min/max ranges (e.g. -1 to +4)', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: -1, maxExposureCompensation: 4 });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-1);
      expect(result.current.maxEC).toBe(4);
    });

    it('uses defaults when min/max are NaN', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: NaN, maxExposureCompensation: NaN });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });
  });

  // ---------------------------------------------------------------------
  // Return shape
  // ---------------------------------------------------------------------
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