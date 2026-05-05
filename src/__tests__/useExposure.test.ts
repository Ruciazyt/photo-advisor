/**
 * useExposure unit tests
 * Tests: initial state, setExposureCompensation, defensive handling, min/max range
 */
import { renderHook, act } from '@testing-library/react-native';
import { useExposure } from '../hooks/useExposure';

// Mock useAnimationFrameTimer — return a no-op timer (no actual polling in tests)
jest.mock('../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));

describe('useExposure', () => {
  describe('initial state', () => {
    it('returns default exposureComp of 0', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('returns default minEC of -2', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
    });

    it('returns default maxEC of 2', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.maxEC).toBe(2);
    });

    it('returns isAdjusting false initially', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.isAdjusting).toBe(false);
    });
  });

  describe('setExposureCompensation', () => {
    it('calls setExposureCompensation on the camera when camera supports it', async () => {
      const mockSetExp = jest.fn().mockResolvedValue(undefined);
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          minExposureCompensation: -2,
          maxExposureCompensation: 2,
          setExposureCompensation: mockSetExp,
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      await act(async () => {
        await result.current.setExposureCompensation(1.5);
      });

      expect(mockSetExp).toHaveBeenCalledWith(1.5);
    });

    it('sets isAdjusting to true during adjustment', async () => {
      let resolveSetExp: () => void;
      const mockSetExp = jest.fn().mockImplementation(
        () => new Promise<void>((res) => { resolveSetExp = res; })
      );
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          setExposureCompensation: mockSetExp,
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.isAdjusting).toBe(false);

      let pendingPromise: Promise<void>;
      await act(async () => {
        pendingPromise = result.current.setExposureCompensation(1.0);
      });

      expect(result.current.isAdjusting).toBe(true);

      await act(async () => {
        resolveSetExp!();
        await pendingPromise;
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('does nothing when cameraRef is null', async () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });
      // No error thrown
    });

    it('does nothing when camera does not support setExposureCompensation', async () => {
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          // setExposureCompensation is undefined
        },
      };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      await act(async () => {
        await result.current.setExposureCompensation(1.0);
      });
      // No error thrown
    });

    it('passes value above max to camera when setting out-of-range value', async () => {
      const mockSetExp = jest.fn().mockResolvedValue(undefined);
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          minExposureCompensation: -2,
          maxExposureCompensation: 2,
          setExposureCompensation: mockSetExp,
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      await act(async () => {
        await result.current.setExposureCompensation(5.0);
      });
      expect(mockSetExp).toHaveBeenCalledWith(5.0);
    });

    it('passes value below min to camera when setting out-of-range value', async () => {
      const mockSetExp = jest.fn().mockResolvedValue(undefined);
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          minExposureCompensation: -2,
          maxExposureCompensation: 2,
          setExposureCompensation: mockSetExp,
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      await act(async () => {
        await result.current.setExposureCompensation(-5.0);
      });
      expect(mockSetExp).toHaveBeenCalledWith(-5.0);
    });
  });

  describe('defensive handling when camera does not support exposure', () => {
    it('returns default exposureComp when exposureCompensation is undefined on camera', () => {
      const cameraRef = {
        current: {
          minExposureCompensation: -2,
          maxExposureCompensation: 2,
          // exposureCompensation is undefined
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
    });

    it('returns default minEC when minExposureCompensation is undefined', () => {
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          // minExposureCompensation is undefined
          maxExposureCompensation: 2,
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.minEC).toBe(-2);
    });

    it('returns default maxEC when maxExposureCompensation is undefined', () => {
      const cameraRef = {
        current: {
          exposureCompensation: 0,
          minExposureCompensation: -2,
          // maxExposureCompensation is undefined
        },
      };

      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.maxEC).toBe(2);
    });

    it('handles camera object with no exposure properties at all', () => {
      const cameraRef = { current: {} };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });

    it('handles cameraRef.current being null', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBe(0);
      expect(result.current.minEC).toBe(-2);
      expect(result.current.maxEC).toBe(2);
    });
  });

  describe('returned API shape', () => {
    it('setExposureCompensation is a function', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(typeof result.current.setExposureCompensation).toBe('function');
    });

    it('all return values are defined', () => {
      const cameraRef = { current: null };
      const { result } = renderHook(() => useExposure(cameraRef as any));
      expect(result.current.exposureComp).toBeDefined();
      expect(result.current.minEC).toBeDefined();
      expect(result.current.maxEC).toBeDefined();
      expect(result.current.setExposureCompensation).toBeDefined();
      expect(result.current.isAdjusting).toBeDefined();
    });
  });
});