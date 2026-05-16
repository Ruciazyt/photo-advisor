/**
 * Unit tests for src/hooks/usePinchToZoom.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePinchToZoom } from '../hooks/usePinchToZoom';

describe('usePinchToZoom', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns initial state: zoomLevel=1.0, isPinching=false, hasUsedPinch=false', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(result.current.zoomLevel).toBe(1.0);
    expect(result.current.isPinching).toBe(false);
    expect(result.current.hasUsedPinch).toBe(false);
  });

  it('onPinchGesture starts polling and sets isPinching to true', () => {
    const mockCamera = { zoom: 1.0 };
    const cameraRef = { current: mockCamera };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));

    act(() => {
      result.current.onPinchGesture();
    });

    expect(result.current.isPinching).toBe(true);

    // Advance timer so polling runs
    act(() => {
      jest.advanceTimersByTime(80);
    });

    expect(result.current.isPinching).toBe(true);
  });

  it('zoomLevel updates when cameraRef.current.zoom changes', () => {
    const mockCamera = { zoom: 1.0 };
    const cameraRef = { current: mockCamera };
    const { result, rerender } = renderHook(() =>
      usePinchToZoom({ cameraRef: cameraRef as any })
    );

    act(() => {
      result.current.onPinchGesture();
    });

    act(() => {
      jest.advanceTimersByTime(80);
    });

    expect(result.current.zoomLevel).toBe(1.0);

    // Change zoom on the mock camera
    (mockCamera as any).zoom = 2.5;

    act(() => {
      jest.advanceTimersByTime(80);
    });

    expect(result.current.zoomLevel).toBe(2.5);
  });

  it('hasUsedPinch becomes true when zoomLevel moves away from 1.0', () => {
    const mockCamera = { zoom: 1.0 };
    const cameraRef = { current: mockCamera };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));

    expect(result.current.hasUsedPinch).toBe(false);

    act(() => {
      result.current.onPinchGesture();
    });

    (mockCamera as any).zoom = 2.0;

    act(() => {
      jest.advanceTimersByTime(80);
    });

    expect(result.current.hasUsedPinch).toBe(true);
  });

  it('dismissHint sets hasUsedPinch to true', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));

    expect(result.current.hasUsedPinch).toBe(false);

    act(() => {
      result.current.dismissHint();
    });

    expect(result.current.hasUsedPinch).toBe(true);
  });

  it('cleanup stops polling on unmount', () => {
    const mockCamera = { zoom: 1.0 };
    const cameraRef = { current: mockCamera };
    const { result, unmount } = renderHook(() =>
      usePinchToZoom({ cameraRef: cameraRef as any })
    );

    act(() => {
      result.current.onPinchGesture();
    });

    unmount();

    // Should not throw when timers advance after unmount
    act(() => {
      jest.advanceTimersByTime(200);
    });
  });

});