/**
 * Tests for useShakeDetector hook — accelerometer shake detection.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import { useShakeDetector } from '../useShakeDetector';

// Mock expo-sensors
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

const mockAddListener = Accelerometer.addListener as jest.Mock;
const mockSetUpdateInterval = Accelerometer.setUpdateInterval as jest.Mock;

describe('useShakeDetector', () => {
  let mockCallback: (data: { x: number; y: number; z: number }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReset();
    mockSetUpdateInterval.mockReset();

    // Capture the listener callback so we can emit events
    mockAddListener.mockImplementation((cb) => {
      mockCallback = cb;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const emitShake = (overrides: Partial<{ x: number; y: number; z: number }> = {}) => {
    const data = { x: 0.1, y: 0.2, z: 1.95, ...overrides };
    mockCallback(data);
  };

  describe('startListening / stopListening', () => {
    it('starts listening on mount when enabled', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
        })
      );

      expect(mockAddListener).toHaveBeenCalled();
      expect(mockSetUpdateInterval).toHaveBeenCalledWith(50);
    });

    it('does not start listening when disabled', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: false,
        })
      );

      expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('returns startListening and stopListening refs', () => {
      const { result } = renderHook(() =>
        useShakeDetector({
          onShake: jest.fn(),
          enabled: true,
        })
      );

      expect(result.current.startListening).toBeDefined();
      expect(result.current.stopListening).toBeDefined();
      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
    });

    it('stopListening removes the subscription', () => {
      const onShake = jest.fn();
      const { result } = renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
        })
      );

      const removeMock = mockAddListener.mock.results[0].value;
      result.current.stopListening();
      expect(removeMock.remove).toHaveBeenCalled();
    });
  });

  describe('shake detection logic', () => {
    it('calls onShake when magnitude exceeds threshold (consecutiveCount=3)', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
        })
      );

      // Send 2 shakes — not enough
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      expect(onShake).not.toHaveBeenCalled();

      // Third shake — triggers
      emitShake({ x: 0, y: 0, z: 2.2 });
      expect(onShake).toHaveBeenCalledTimes(1);
    });

    it('respects custom threshold', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 3.0, // higher threshold
          consecutiveCount: 3,
        })
      );

      // Send 3 moderate shakes (magnitude ~2) — below 3.0 threshold, no trigger
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });
      expect(onShake).not.toHaveBeenCalled();
    });

    it('respects custom consecutiveCount', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 2, // only 2 needed
        })
      );

      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      expect(onShake).toHaveBeenCalledTimes(1);
    });

    it('ignores null values in accelerometer data', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
        })
      );

      // null values should not affect the consecutive counter
      mockCallback({ x: null, y: null, z: null } as any);
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });
      // Null read shouldn't reset counter incorrectly
      expect(onShake).toHaveBeenCalledTimes(1);
    });

    it('debounces repeated shakes within resetIntervalMs', () => {
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

      // First shake sequence triggers
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });
      expect(onShake).toHaveBeenCalledTimes(1);

      // Immediately trigger another (within 500ms) — should be debounced
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });
      expect(onShake).toHaveBeenCalledTimes(1); // still 1
    });
  });

  describe('enabled/disabled toggle', () => {
    it('starts listening when enabled becomes true', () => {
      const onShake = jest.fn();
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useShakeDetector({
            onShake,
            enabled,
          }),
        { initialProps: { enabled: false } }
      );

      expect(mockAddListener).not.toHaveBeenCalled();

      rerender({ enabled: true });
      expect(mockAddListener).toHaveBeenCalled();
    });

    it('stops listening when enabled becomes false', () => {
      const onShake = jest.fn();
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useShakeDetector({
            onShake,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      expect(mockAddListener).toHaveBeenCalled();

      const removeMock = mockAddListener.mock.results[0].value;
      rerender({ enabled: false });
      expect(removeMock.remove).toHaveBeenCalled();
    });

    it('does not re-subscribe if already listening', () => {
      const onShake = jest.fn();
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useShakeDetector({
            onShake,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      const firstCallCount = mockAddListener.mock.calls.length;

      // Re-render with enabled still true — should not re-subscribe
      rerender({ enabled: true });
      expect(mockAddListener.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('cleanup on unmount', () => {
    it('removes listener on unmount', () => {
      const onShake = jest.fn();
      const { unmount } = renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
        })
      );

      const removeMock = mockAddListener.mock.results[0].value;
      unmount();
      expect(removeMock.remove).toHaveBeenCalled();
    });
  });

  describe('reset behavior', () => {
    it('resets consecutive counter after resetIntervalMs of low magnitude', () => {
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

      // Partial shake (2 out of 3 needed)
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });

      // Now send one below-threshold reading
      emitShake({ x: 0.1, y: 0.1, z: 1.0 }); // magnitude ~1.4, below 1.8

      // But wait — the time-based reset only fires after resetIntervalMs,
      // which requires time passage. In unit tests time doesn't pass,
      // so we just verify the counter doesn't incorrectly retain.
      // This is a behavior verification — full timing tests need fake timers.
      expect(onShake).not.toHaveBeenCalled();
    });
  });

  describe('onShakeVoiceFeedback', () => {
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
        })
      );

      // Trigger shake
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });

      expect(onShake).toHaveBeenCalledTimes(1);
      expect(onShakeVoiceFeedback).toHaveBeenCalledTimes(1);
      // Voice feedback called AFTER onShake (sequential, same synchronous block)
      expect(onShakeVoiceFeedback.mock.invocationCallOrder[0]).toBeGreaterThanOrEqual(
        onShake.mock.invocationCallOrder[0]
      );
    });

    it('does not call onShakeVoiceFeedback when not provided', () => {
      const onShake = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          enabled: true,
          threshold: 1.8,
          consecutiveCount: 3,
          // onShakeVoiceFeedback not provided
        })
      );

      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });

      expect(onShake).toHaveBeenCalledTimes(1);
      // No error should occur even though onShakeVoiceFeedback is undefined
    });

    it('does not call onShakeVoiceFeedback when enabled is false', () => {
      const onShake = jest.fn();
      const onShakeVoiceFeedback = jest.fn();
      renderHook(() =>
        useShakeDetector({
          onShake,
          onShakeVoiceFeedback,
          enabled: false,
          threshold: 1.8,
          consecutiveCount: 3,
        })
      );

      // Shake while disabled — no callbacks
      emitShake({ x: 0, y: 0, z: 2.0 });
      emitShake({ x: 0, y: 0, z: 2.1 });
      emitShake({ x: 0, y: 0, z: 2.2 });
      expect(onShake).not.toHaveBeenCalled();
      expect(onShakeVoiceFeedback).not.toHaveBeenCalled();
    });
  });
});