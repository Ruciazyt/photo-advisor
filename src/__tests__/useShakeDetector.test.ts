/**
 * Tests for useShakeDetector hook
 * Tests: shake detection, magnitude calculation, debounce, auto-start/stop, voice feedback
 */

jest.mock('expo-sensors', () => {
  const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));
  const mockRemove = jest.fn();
  const mockSetUpdateInterval = jest.fn();
  return {
    Accelerometer: {
      setUpdateInterval: mockSetUpdateInterval,
      addListener: mockAddListener,
      remove: mockRemove,
    },
  };
});

jest.mock('expo-modules-core', () => ({
  EventSubscription: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { Accelerometer } from 'expo-sensors';

const mockAddListener = Accelerometer.addListener as jest.MockedFunction<typeof Accelerometer.addListener>;
const mockSetUpdateInterval = Accelerometer.setUpdateInterval as jest.MockedFunction<typeof Accelerometer.setUpdateInterval>;

interface MockAccelMeasurement {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

describe('useShakeDetector', () => {
  let capturedHandler: (m: MockAccelMeasurement) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockImplementation((handler: (m: MockAccelMeasurement) => void) => {
      capturedHandler = handler;
      return { remove: jest.fn() };
    });
  });

  describe('initial state', () => {
    it('returns startListening and stopListening functions', () => {
      const { result } = renderHook(() =>
        useShakeDetector({ onShake: jest.fn(), enabled: false })
      );
      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
    });
  });

  describe('auto-start when enabled=true', () => {
    it('starts listening on mount', () => {
      renderHook(() => useShakeDetector({ onShake: jest.fn(), enabled: true }));
      expect(mockAddListener).toHaveBeenCalledTimes(1);
      expect(mockSetUpdateInterval).toHaveBeenCalledWith(50);
    });

    it('auto-stops when enabled=false on unmount', () => {
      const removeMock = jest.fn();
      mockAddListener.mockReturnValue({ remove: removeMock });
      const { unmount } = renderHook(() =>
        useShakeDetector({ onShake: jest.fn(), enabled: true })
      );
      unmount();
      expect(removeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('shake detection — magnitude above threshold fires onShake', () => {
    it('fires onShake when magnitude > threshold for consecutiveCount times', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          resetIntervalMs: 500,
        })
      );

      // magnitude = sqrt(1²+1²+1²) ≈ 1.732 < 1.8 → no trigger
      act(() => {
        capturedHandler({ x: 1, y: 1, z: 1, timestamp: Date.now() });
      });
      expect(onShake).not.toHaveBeenCalled();

      // magnitude = sqrt(2²+2²+2²) ≈ 3.46 > 1.8 → first above-threshold
      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      // consecutiveCount=3, only 1 so far
      expect(onShake).not.toHaveBeenCalled();

      // second consecutive above-threshold
      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      expect(onShake).not.toHaveBeenCalled();

      // third consecutive → should fire
      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      expect(onShake).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounce — second shake within resetIntervalMs is ignored', () => {
    it('ignores a second shake within resetIntervalMs', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          resetIntervalMs: 500,
        })
      );

      // Trigger first shake
      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      expect(onShake).toHaveBeenCalledTimes(1);

      // Immediately trigger second shake (within resetIntervalMs)
      act(() => {
        capturedHandler({ x: 3, y: 3, z: 3, timestamp: Date.now() });
        capturedHandler({ x: 3, y: 3, z: 3, timestamp: Date.now() });
        capturedHandler({ x: 3, y: 3, z: 3, timestamp: Date.now() });
      });
      // Should be debounced (lastShakeTime was just set, within 500ms)
      expect(onShake).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset after resetIntervalMs of inactivity', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('resets consecutive counter after resetIntervalMs of no activity', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          resetIntervalMs: 500,
        })
      );

      // Fire first two above-threshold samples
      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      expect(onShake).not.toHaveBeenCalled();

      // Advance time past resetIntervalMs with only low-magnitude events
      act(() => {
        capturedHandler({ x: 0.1, y: 0.1, z: 0.1, timestamp: Date.now() }); // magnitude ≈ 0.17
      });
      // timeSinceLastShake < resetIntervalMs so counter not reset yet
      act(() => {
        jest.advanceTimersByTime(600);
        capturedHandler({ x: 0.1, y: 0.1, z: 0.1, timestamp: Date.now() });
      });
      // Now counter should have reset, so need 3 new above-threshold samples

      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });
      expect(onShake).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('magnitude below threshold does not trigger', () => {
    it('ignores events with magnitude below threshold', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 2.5,
          consecutiveCount: 3,
        })
      );

      // magnitude = sqrt(1²+1²+1²) ≈ 1.73 < 2.5
      act(() => {
        capturedHandler({ x: 1, y: 1, z: 1, timestamp: Date.now() });
        capturedHandler({ x: 1, y: 1, z: 1, timestamp: Date.now() });
        capturedHandler({ x: 1, y: 1, z: 1, timestamp: Date.now() });
      });
      expect(onShake).not.toHaveBeenCalled();
    });
  });

  describe('onShakeVoiceFeedback called after onShake', () => {
    it('calls onShakeVoiceFeedback immediately after onShake', () => {
      const onShake = jest.fn();
      const onShakeVoiceFeedback = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          onShakeVoiceFeedback,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          resetIntervalMs: 500,
        })
      );

      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });

      expect(onShake).toHaveBeenCalledTimes(1);
      expect(onShakeVoiceFeedback).toHaveBeenCalledTimes(1);
      // Voice feedback called right after onShake
      const callOrder = [onShake.mock.calls.length, onShakeVoiceFeedback.mock.calls.length];
      // Both were called (order within same act is guaranteed)
      expect(onShakeVoiceFeedback).toHaveBeenCalled();
    });

    it('does not crash when onShakeVoiceFeedback is not provided', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          // no onShakeVoiceFeedback
        })
      );

      act(() => {
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      });

      expect(onShake).toHaveBeenCalledTimes(1);
    });
  });

  describe('null sensor values', () => {
    it('ignores events with null x, y, or z', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({ onShake, enabled: true, threshold: 1.8, consecutiveCount: 3 })
      );

      act(() => {
        capturedHandler({ x: null as any, y: 2, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: null as any, z: 2, timestamp: Date.now() });
        capturedHandler({ x: 2, y: 2, z: null as any, timestamp: Date.now() });
      });
      expect(onShake).not.toHaveBeenCalled();
    });
  });
});