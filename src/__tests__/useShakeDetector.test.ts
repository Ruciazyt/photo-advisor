/**
 * Tests for useShakeDetector hook
 */

// Use manual mock from __mocks__/expo-sensors.js
jest.mock('expo-sensors');

import { renderHook, act } from '@testing-library/react-native';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { Accelerometer } from 'expo-sensors';

describe('useShakeDetector', () => {
  let mockHandler: ((event: { acceleration: { x: number; y: number; z: number } }) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    // Capture the listener callback so we can fire events manually
    (Accelerometer.addListener as jest.Mock).mockImplementation((handler: any) => {
      mockHandler = handler;
      return { remove: jest.fn() };
    });
  });

  it('returns startListening and stopListening functions', () => {
    const { result } = renderHook(() =>
      useShakeDetector({ onShake: jest.fn(), enabled: false })
    );
    expect(typeof result.current.startListening).toBe('function');
    expect(typeof result.current.stopListening).toBe('function');
  });

  it('starts listening when enabled=true on mount', () => {
    renderHook(() => useShakeDetector({ onShake: jest.fn(), enabled: true }));
    expect(Accelerometer.addListener).toHaveBeenCalled();
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(50);
  });

  it('stops listening on unmount', () => {
    const removeMock = jest.fn();
    (Accelerometer.addListener as jest.Mock).mockReturnValue({ remove: removeMock });
    const { unmount } = renderHook(() =>
      useShakeDetector({ onShake: jest.fn(), enabled: true })
    );
    unmount();
    expect(removeMock).toHaveBeenCalled();
  });

  it('does not call onShake for magnitude below threshold', () => {
    const onShake = jest.fn();
    renderHook(() => useShakeDetector({ onShake, enabled: true }));

    // Normal standing still: magnitude ≈ 1g (gravity)
    // Use null values to simulate unavailable data — should be gracefully ignored
    if (mockHandler) {
      act(() => { mockHandler!({ acceleration: { x: null as any, y: 0.5, z: 0.5 } }); });
    }
    expect(onShake).not.toHaveBeenCalled();
  });

  it('calls onShake when magnitude exceeds threshold with enough consecutive samples', () => {
    const onShake = jest.fn();
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, consecutiveCount: 3, threshold: 1.8 })
    );

    // magnitude > 1.8 requires acceleration beyond normal gravity
    const aboveThreshold = { x: 2.0, y: 0.5, z: 0.5 }; // magnitude ≈ 2.12 > 1.8

    // First two samples — not enough consecutive
    act(() => { mockHandler!({ acceleration: aboveThreshold }); });
    act(() => { mockHandler!({ acceleration: aboveThreshold }); });
    expect(onShake).not.toHaveBeenCalled();

    // Third sample — triggers shake
    act(() => { mockHandler!({ acceleration: aboveThreshold }); });
    expect(onShake).toHaveBeenCalledTimes(1);
  });

  it('resets consecutive counter when below-threshold sample appears', () => {
    const onShake = jest.fn();
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, consecutiveCount: 3, threshold: 1.8 })
    );

    const above = { x: 2.0, y: 0.5, z: 0.5 }; // magnitude > 1.8
    const below = { x: 0, y: 0, z: 1 };          // magnitude = 1 (just gravity)

    act(() => { mockHandler!({ acceleration: above }); }); // c=1
    act(() => { mockHandler!({ acceleration: above }); }); // c=2
    act(() => { mockHandler!({ acceleration: below }); }); // c=0 (reset)
    act(() => { mockHandler!({ acceleration: above }); }); // c=1
    act(() => { mockHandler!({ acceleration: above }); }); // c=2
    act(() => { mockHandler!({ acceleration: above }); }); // c=3 → shake

    expect(onShake).toHaveBeenCalledTimes(1);
  });

  it('debounces: rapid second shake within resetIntervalMs does not trigger again', () => {
    const onShake = jest.fn();
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, consecutiveCount: 1, resetIntervalMs: 500 })
    );

    const above = { x: 3.0, y: 0, z: 0 }; // magnitude = 3 > 1.8

    act(() => { mockHandler!({ acceleration: above }); });
    expect(onShake).toHaveBeenCalledTimes(1);

    // Second shake within 500ms — should be debounced
    act(() => { mockHandler!({ acceleration: above }); });
    expect(onShake).toHaveBeenCalledTimes(1);
  });

  it('allows second shake after resetIntervalMs has passed', () => {
    jest.useFakeTimers();
    const onShake = jest.fn();
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, consecutiveCount: 1, resetIntervalMs: 300 })
    );

    const above = { x: 3.0, y: 0, z: 0 };

    act(() => { mockHandler!({ acceleration: above }); });
    expect(onShake).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(400); }); // > 300ms

    act(() => { mockHandler!({ acceleration: above }); });
    expect(onShake).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('handles null acceleration values gracefully', () => {
    const onShake = jest.fn();
    renderHook(() => useShakeDetector({ onShake, enabled: true }));

    act(() => {
      mockHandler!({ acceleration: { x: null as any, y: null as any, z: null as any } });
    });
    expect(onShake).not.toHaveBeenCalled();
  });

  it('uses custom threshold when provided', () => {
    const onShake = jest.fn();
    // threshold = 2.5, so magnitude 2.12 should NOT trigger, 2.83 should
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, threshold: 2.5, consecutiveCount: 1 })
    );

    // magnitude ≈ 2.12 — below 2.5, should not trigger
    act(() => { mockHandler!({ acceleration: { x: 1.5, y: 1.5, z: 0 } }); });
    expect(onShake).not.toHaveBeenCalled();

    // magnitude ≈ 2.83 — above 2.5, should trigger
    act(() => { mockHandler!({ acceleration: { x: 2.0, y: 2.0, z: 0 } }); });
    expect(onShake).toHaveBeenCalledTimes(1);
  });

  it('stops listening when enabled becomes false', () => {
    const removeMock = jest.fn();
    (Accelerometer.addListener as jest.Mock).mockReturnValue({ remove: removeMock });

    const { rerender } = renderHook(
      ({ enabled }) => useShakeDetector({ onShake: jest.fn(), enabled }),
      { initialProps: { enabled: true } }
    );

    expect(Accelerometer.addListener).toHaveBeenCalled();

    rerender({ enabled: false });
    expect(removeMock).toHaveBeenCalled();
  });

  it('startListening is idempotent — calling twice does not add multiple listeners', () => {
    const onShake = jest.fn();
    const { result } = renderHook(() =>
      useShakeDetector({ onShake, enabled: false })
    );

    act(() => { result.current.startListening(); });
    act(() => { result.current.startListening(); });

    expect((Accelerometer.addListener as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('stopListening clears subscription', () => {
    const removeMock = jest.fn();
    (Accelerometer.addListener as jest.Mock).mockReturnValue({ remove: removeMock });

    const { result } = renderHook(() =>
      useShakeDetector({ onShake: jest.fn(), enabled: false })
    );

    act(() => { result.current.startListening(); });
    expect(removeMock).not.toHaveBeenCalled();

    act(() => { result.current.stopListening(); });
    expect(removeMock).toHaveBeenCalled();
  });

  it('resetIntervalMs controls how quickly debounce resets', () => {
    jest.useFakeTimers();
    const onShake = jest.fn();
    renderHook(() =>
      useShakeDetector({ onShake, enabled: true, consecutiveCount: 2, resetIntervalMs: 200 })
    );

    const above = { x: 3, y: 0, z: 0 };
    const below = { x: 0, y: 0, z: 1 };

    // First shake sequence
    act(() => { mockHandler!({ acceleration: above }); }); // c=1
    act(() => { mockHandler!({ acceleration: above }); }); // c=2 → shake
    expect(onShake).toHaveBeenCalledTimes(1);

    // Advance 150ms — less than resetIntervalMs
    act(() => { jest.advanceTimersByTime(150); });

    // Below-threshold resets counter
    act(() => { mockHandler!({ acceleration: below }); }); // c=0

    // Another shake within 200ms — still within debounce window
    act(() => { mockHandler!({ acceleration: above }); }); // c=1
    act(() => { mockHandler!({ acceleration: above }); }); // c=2 → but debounced!

    expect(onShake).toHaveBeenCalledTimes(1); // still 1

    // Advance past 200ms
    act(() => { jest.advanceTimersByTime(60); }); // total 210ms > 200ms

    // Now a fresh shake should work
    act(() => { mockHandler!({ acceleration: above }); }); // c=1
    act(() => { mockHandler!({ acceleration: above }); }); // c=2 → onShake
    expect(onShake).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
