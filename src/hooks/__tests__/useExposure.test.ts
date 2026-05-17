/**
 * Unit tests for src/hooks/useExposure.ts
 *
 * Mocks: react-native-reanimated (useFrameCallback),
 *        hooks/useAnimationFrameTimer
 */

jest.mock('react-native-reanimated', () => ({
  useFrameCallback: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
}));

jest.mock('../useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useExposure } from '../useExposure';
import { useAnimationFrameTimer } from '../useAnimationFrameTimer';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useExposure', () => {
  it('registers useAnimationFrameTimer on mount', () => {
    const mockCamera = {
      exposureCompensation: 0,
      minExposureCompensation: -2,
      maxExposureCompensation: 2,
    };
    renderHook(() =>
      useExposure({ current: mockCamera as any })
    );
    expect(useAnimationFrameTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        intervalMs: 500,
        enabled: true,
        onTick: expect.any(Function),
      })
    );
  });

  it('initialises exposureComp/minEC/maxEC from camera when cameraRef.current exists', () => {
    const mockCamera = {
      exposureCompensation: 1,
      minExposureCompensation: -3,
      maxExposureCompensation: 3,
    };
    const { result } = renderHook(() =>
      useExposure({ current: mockCamera as any })
    );
    expect(result.current.exposureComp).toBe(1);
    expect(result.current.minEC).toBe(-3);
    expect(result.current.maxEC).toBe(3);
  });

  it('initialises with defaults when cameraRef.current is null', () => {
    const { result } = renderHook(() => useExposure({ current: null }));
    expect(result.current.exposureComp).toBe(0);
    expect(result.current.minEC).toBe(-2);
    expect(result.current.maxEC).toBe(2);
  });

  it('setExposureCompensation: early returns when cameraRef.current is null', async () => {
    const mockSetExposureCompensation = jest.fn();
    const { result } = renderHook(() => useExposure({ current: null }));
    await act(async () => {
      await result.current.setExposureCompensation(1);
    });
    // No error thrown (early return), isAdjusting briefly set then cleared
    expect(result.current.isAdjusting).toBe(false);
  });

  it('setExposureCompensation: calls camera.setExposureCompensation and updates state on success', async () => {
    const mockCamera = {
      exposureCompensation: 0,
      minExposureCompensation: -2,
      maxExposureCompensation: 2,
      setExposureCompensation: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = renderHook(() =>
      useExposure({ current: mockCamera as any })
    );

    await act(async () => {
      await result.current.setExposureCompensation(1);
    });

    expect(mockCamera.setExposureCompensation).toHaveBeenCalledWith(1);
    expect(result.current.exposureComp).toBe(1);
    expect(result.current.isAdjusting).toBe(false);
  });

  it('setExposureCompensation: sets isAdjusting back to false even when setExposureCompensation throws', async () => {
    const mockCamera = {
      exposureCompensation: 0,
      minExposureCompensation: -2,
      maxExposureCompensation: 2,
      setExposureCompensation: jest.fn().mockRejectedValue(new Error('not supported')),
    };
    const { result } = renderHook(() =>
      useExposure({ current: mockCamera as any })
    );

    await act(async () => {
      try {
        await result.current.setExposureCompensation(1);
      } catch {
        // Expected: the underlying call throws, but finally resets isAdjusting
      }
    });

    // finally runs even on throw, so isAdjusting is back to false
    expect(result.current.isAdjusting).toBe(false);
  });

  it('setExposureCompensation: does nothing when setExposureCompensation is not a function', async () => {
    const mockCamera = {
      exposureCompensation: 0,
      minExposureCompensation: -2,
      maxExposureCompensation: 2,
      setExposureCompensation: undefined,
    };
    const { result } = renderHook(() =>
      useExposure({ current: mockCamera as any })
    );

    await act(async () => {
      await result.current.setExposureCompensation(1);
    });

    // exposureComp stays 0 since the function was not called
    expect(result.current.exposureComp).toBe(0);
    expect(result.current.isAdjusting).toBe(false);
  });

  it('setExposureCompensation: does nothing when camera is null (no crash)', async () => {
    const { result } = renderHook(() => useExposure({ current: null }));
    await act(async () => {
      // Should not throw
      await result.current.setExposureCompensation(1);
    });
    expect(result.current.isAdjusting).toBe(false);
  });

  it('isAdjusting is true during setExposureCompensation call', async () => {
    let resolveSet: () => void;
    const mockCamera = {
      exposureCompensation: 0,
      minExposureCompensation: -2,
      maxExposureCompensation: 2,
      setExposureCompensation: jest.fn(
        () =>
          new Promise((res) => {
            resolveSet = res;
          })
      ),
    };
    const { result } = renderHook(() =>
      useExposure({ current: mockCamera as any })
    );

    let isAdjustingDuringCall: boolean | undefined;
    act(() => {
      result.current.setExposureCompensation(1).then(() => {
        isAdjustingDuringCall = result.current.isAdjusting;
      });
    });

    // Advance microtasks to start the promise but not resolve it yet
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isAdjusting).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolveSet!();
    });

    expect(result.current.isAdjusting).toBe(false);
  });
});