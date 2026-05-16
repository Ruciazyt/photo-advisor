/**
 * Tests for usePinchToZoom hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePinchToZoom } from '../usePinchToZoom';
import type { CameraView } from 'expo-camera';

jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: 1080, height: 1920 }),
  },
}));

// Mock the camera ref
const createMockCameraRef = () => ({
  current: {
    zoom: 1.0,
  } as CameraView | null,
});

describe('usePinchToZoom', () => {
  it('initializes with default values', () => {
    const cameraRef = createMockCameraRef();
    const { result } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    expect(result.current.zoomLevel).toBe(1.0);
    expect(result.current.isPinching).toBe(false);
    expect(result.current.hasUsedPinch).toBe(false);
    expect(typeof result.current.onPinchGesture).toBe('function');
    expect(typeof result.current.dismissHint).toBe('function');
  });

  it('onPinchGesture sets isPinching to true', () => {
    const cameraRef = createMockCameraRef();
    const { result } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    act(() => {
      result.current.onPinchGesture();
    });

    // isPinching becomes true after onPinchGesture is called
    expect(result.current.isPinching).toBe(true);
  });

  it('dismissHint sets hasUsedPinch to true', () => {
    const cameraRef = createMockCameraRef();
    const { result } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    expect(result.current.hasUsedPinch).toBe(false);
    act(() => {
      result.current.dismissHint();
    });
    expect(result.current.hasUsedPinch).toBe(true);
  });

  it('returns stable onPinchGesture callback (does not change between renders)', () => {
    const cameraRef = createMockCameraRef();
    const { result, rerender } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    const firstCallback = result.current.onPinchGesture;
    rerender();
    const secondCallback = result.current.onPinchGesture;

    expect(firstCallback).toBe(secondCallback);
  });

  it('returns stable zoomLevel (does not change between renders when no zoom)', () => {
    const cameraRef = createMockCameraRef();
    const { result, rerender } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    const firstZoom = result.current.zoomLevel;
    rerender();
    const secondZoom = result.current.zoomLevel;

    expect(firstZoom).toBe(secondZoom);
  });

  it('enabled=false returns no-op onPinchGesture', () => {
    const cameraRef = createMockCameraRef();
    const { result } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: false })
    );

    // Should not throw when called
    act(() => {
      result.current.onPinchGesture();
    });

    // isPinching should remain false when disabled
    expect(result.current.isPinching).toBe(false);
  });

  it('hasUsedPinch starts as false', () => {
    const cameraRef = createMockCameraRef();
    const { result } = renderHook(() =>
      usePinchToZoom({ cameraRef, enabled: true })
    );

    expect(result.current.hasUsedPinch).toBe(false);
  });
});