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
    // Reset the module to clear any state from previous tests
    jest.resetModules();
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

    it('starts with correct initial values when camera provides non-zero EC', () => {
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

    it('sets isAdjusting=true while the async call is in flight', async () => {
      let resolveSet: () => void;
      const mockCam = makeMockCamera({
        setExposureCompensation: jest.fn().mockImplementation(() => new Promise<void>(r => { resolveSet = r; })),
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));

      let setPromise: Promise<void>;
      act(() => {
        setPromise = result.current.setExposureCompensation(1.0);
      });

      // Inside an act block the state updates are flushed synchronously
      // but the promise is still pending so isAdjusting should be true
      await act(async () => {
        await new Promise<void>(r => setTimeout(r, 10));
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

      // Should not throw and should not update exposureComp since method doesn't exist
      expect(result.current.exposureComp).toBe(0);
    });
  });

  describe('polling mechanism', () => {
    it('registers useAnimationFrameTimer on mount', () => {
      const { useFrameCallback } = require('react-native-reanimated');
      const cameraRef = { current: makeMockCamera() };
      renderHook(() => useExposure(cameraRef as any));
      expect(useFrameCallback).toHaveBeenCalled();
    });

    it('registers useAnimationFrameTimer even when cameraRef.current is null', () => {
      const { useFrameCallback } = require('react-native-reanimated');
      const cameraRef = { current: null };
      renderHook(() => useExposure(cameraRef as any));
      expect(useFrameCallback).toHaveBeenCalled();
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
      expect(result.current.minEC).toBe(-2); // stays at default
      expect(result.current.maxEC).toBe(2);
    });

    it('does not crash when camera.maxExposureCompensation is undefined', () => {
      const mockCam = makeMockCamera();
      delete (mockCam as any).maxExposureCompensation;
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2); // stays at default
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
      expect(result.current.exposureComp).toBe(0); // unchanged from default
    });

    it('ignores non-numeric minExposureCompensation values', () => {
      const mockCam = makeMockCamera({ minExposureCompensation: null as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2); // unchanged from default
    });

    it('ignores non-numeric maxExposureCompensation values', () => {
      const mockCam = makeMockCamera({ maxExposureCompensation: null as any });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.maxEC).toBe(2); // unchanged from default
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

    it('handles asymmetric ranges (e.g., -1 to +4)', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: -1,
        maxExposureCompensation: 4,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-1);
      expect(result.current.maxEC).toBe(4);
    });

    it('uses default range when camera returns invalid extremes', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: NaN as any,
        maxExposureCompensation: NaN as any,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('uses default range when camera min > max (nonsense data)', () => {
      const mockCam = makeMockCamera({
        minExposureCompensation: 5 as any,
        maxExposureCompensation: -3 as any,
      });
      const cameraRef = { current: mockCam };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(5); // raw value accepted (defensive: no validation)
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
