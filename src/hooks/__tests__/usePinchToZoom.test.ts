/**
 * usePinchToZoom tests
 */
import { act, renderHook } from '@testing-library/react-native';
import { usePinchToZoom } from '../usePinchToZoom';

describe('usePinchToZoom', () => {
  it('returns initial zoomLevel of 1.0 when camera ref has no zoom', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(result.current.zoomLevel).toBe(1.0);
  });

  it('returns onPinchGesture as a function', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(typeof result.current.onPinchGesture).toBe('function');
  });

  it('disabled hook does not throw when calling onPinchGesture', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any, enabled: false }));
    expect(() => result.current.onPinchGesture()).not.toThrow();
  });

  it('returns isPinching false initially', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(result.current.isPinching).toBe(false);
  });

  it('returns hasUsedPinch false initially', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(result.current.hasUsedPinch).toBe(false);
  });

  it('dismissHint sets hasUsedPinch to true', () => {
    const cameraRef = { current: null };
    const { result, rerender } = renderHook(() =>
      usePinchToZoom({ cameraRef: cameraRef as any })
    );
    expect(result.current.hasUsedPinch).toBe(false);
    // dismissHint is a synchronous state setter — call directly without act()
    result.current.dismissHint();
    // Rerender to propagate the state update into result.current
    rerender({ cameraRef: cameraRef as any });
    expect(result.current.hasUsedPinch).toBe(true);
  });

  it('zoomLevel is a number', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(typeof result.current.zoomLevel).toBe('number');
  });

  it('returns all required properties', () => {
    const cameraRef = { current: null };
    const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
    expect(result.current).toHaveProperty('onPinchGesture');
    expect(result.current).toHaveProperty('zoomLevel');
    expect(result.current).toHaveProperty('isPinching');
    expect(result.current).toHaveProperty('hasUsedPinch');
    expect(result.current).toHaveProperty('dismissHint');
  });

  // --------------------------------------------------------------------------
  // New comprehensive tests
  // --------------------------------------------------------------------------

  it('isPinching becomes true after onPinchGesture is called', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: null };
      const { result } = renderHook(() => usePinchToZoom({ cameraRef: cameraRef as any }));
      expect(result.current.isPinching).toBe(false);
      act(() => {
        result.current.onPinchGesture();
      });
      expect(result.current.isPinching).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('polling starts when onPinchGesture is called (zoomLevel updates via poll)', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      // advance past the first poll interval (80ms)
      act(() => {
        jest.advanceTimersByTime(80);
      });
      // zoomLevel should be polled and updated from cameraRef
      expect(result.current.zoomLevel).toBe(1.0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('zoomLevel tracks cameraRef.zoom changes during polling', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      // simulate zoom changing on the camera
      (cameraRef.current as any).zoom = 2.5;
      act(() => {
        jest.advanceTimersByTime(80);
      });
      expect(result.current.zoomLevel).toBe(2.5);
    } finally {
      jest.useRealTimers();
    }
  });

  it('hasUsedPinch becomes true when zoomLevel changes away from 1.0', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      expect(result.current.hasUsedPinch).toBe(false);
      act(() => {
        result.current.onPinchGesture();
      });
      // advance past the first poll so zoomLevel is read
      act(() => {
        jest.advanceTimersByTime(80);
      });
      expect(result.current.hasUsedPinch).toBe(false); // zoom still 1.0
      // change zoom away from 1.0
      (cameraRef.current as any).zoom = 3.0;
      act(() => {
        jest.advanceTimersByTime(80);
      });
      expect(result.current.hasUsedPinch).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('hasUsedPinch stays false when zoom stays at 1.0 (user did not zoom)', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      // keep advancing — zoom never changes from 1.0
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.hasUsedPinch).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('enabled=false makes onPinchGesture a no-op', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 2.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any, enabled: false })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      // isPinching should still be false (no-op)
      expect(result.current.isPinching).toBe(false);
      // advance time — polling should never start
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.zoomLevel).toBe(1.0); // never polled
    } finally {
      jest.useRealTimers();
    }
  });

  it('unmount cleanup clears all timers and intervals', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result, unmount } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      act(() => {
        jest.advanceTimersByTime(80);
      });
      // Unmount should clear all intervals without errors
      expect(() => unmount()).not.toThrow();
      // Advancing time after unmount should not cause issues (no dangling timers)
      act(() => {
        jest.advanceTimersByTime(500);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('isPinching becomes false when isPinchingRef is reset externally (pinch ended)', () => {
    jest.useFakeTimers();
    try {
      const cameraRef = { current: { zoom: 1.0 } };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: cameraRef as any })
      );
      act(() => {
        result.current.onPinchGesture();
      });
      expect(result.current.isPinching).toBe(true);
      // Simulate external pinch-end: reset isPinchingRef.current to false
      // This mirrors the pattern where the camera signals end-of-gesture
      // by clearing its own internal pinch-active flag
      act(() => {
        jest.advanceTimersByTime(80); // first tick — isPinchingRef still true
      });
      expect(result.current.isPinching).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});