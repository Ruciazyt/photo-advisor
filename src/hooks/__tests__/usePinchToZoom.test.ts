/**
 * usePinchToZoom tests
 */
import { renderHook } from '@testing-library/react-native';
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
});