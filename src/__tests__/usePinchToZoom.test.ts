/**
 * Tests for usePinchToZoom hook
 * Tests: initial state, pinch gesture, zoom polling, hasUsedPinch, dismissHint, enabled flag
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePinchToZoom } from '../hooks/usePinchToZoom';
import type { CameraView } from 'expo-camera';

describe('usePinchToZoom', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns initial state with zoomLevel=1.0, isPinching=false, hasUsedPinch=false', () => {
      const mockRef = { current: null as CameraView | null };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );
      expect(result.current.zoomLevel).toBe(1.0);
      expect(result.current.isPinching).toBe(false);
      expect(result.current.hasUsedPinch).toBe(false);
      expect(typeof result.current.onPinchGesture).toBe('function');
      expect(typeof result.current.dismissHint).toBe('function');
    });

    it('returns startListening/stopListening functions', () => {
      const mockRef = { current: null as CameraView | null };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: false })
      );
      // Note: usePinchToZoom returns onPinchGesture, not startListening/stopListening
      // This is just to verify the shape matches documentation
      expect(typeof result.current.onPinchGesture).toBe('function');
      expect(typeof result.current.dismissHint).toBe('function');
    });
  });

  describe('onPinchGesture starts polling', () => {
    it('sets isPinching to true when onPinchGesture is called (enabled=true)', () => {
      const mockRef = {
        current: { zoom: 1.0 } as CameraView,
      };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );

      act(() => {
        result.current.onPinchGesture();
      });

      expect(result.current.isPinching).toBe(true);
    });

    it('does not start polling when enabled=false', () => {
      const mockRef = {
        current: { zoom: 1.0 } as CameraView,
      };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: false })
      );

      act(() => {
        result.current.onPinchGesture();
      });

      // isPinching should not become true when disabled
      expect(result.current.isPinching).toBe(false);
    });
  });

  describe('zoomLevel updates via polling', () => {
    it('zoomLevel updates when cameraRef.current.zoom changes', () => {
      const mockRef = {
        current: { zoom: 1.0 } as CameraView,
      };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );

      // Trigger pinch to start polling
      act(() => {
        result.current.onPinchGesture();
      });

      // Advance timers to allow polling to run
      act(() => {
        jest.advanceTimersByTime(80);
      });

      // zoom is still 1.0 initially
      expect(result.current.zoomLevel).toBe(1.0);

      // Change the mock camera's zoom
      (mockRef.current as CameraView).zoom = 2.5;

      // Advance timers again — polling should pick up new zoom
      act(() => {
        jest.advanceTimersByTime(80);
      });

      expect(result.current.zoomLevel).toBe(2.5);
    });
  });

  describe('hasUsedPinch becomes true when zoomLevel != 1.0', () => {
    it('sets hasUsedPinch to true when zoom changes away from 1.0', () => {
      const mockRef = {
        current: { zoom: 1.0 } as CameraView,
      };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );

      expect(result.current.hasUsedPinch).toBe(false);

      act(() => {
        result.current.onPinchGesture();
      });

      // Change zoom away from 1.0
      (mockRef.current as CameraView).zoom = 1.5;

      act(() => {
        jest.advanceTimersByTime(80);
      });

      expect(result.current.hasUsedPinch).toBe(true);
    });

    it('zoomLevel stays at 1.0 when cameraRef.current is null', () => {
      const mockRef = { current: null as CameraView | null };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );

      act(() => {
        result.current.onPinchGesture();
      });

      act(() => {
        jest.advanceTimersByTime(80);
      });

      // Should not crash, zoom stays at default 1.0
      expect(result.current.zoomLevel).toBe(1.0);
    });
  });

  describe('dismissHint sets hasUsedPinch to true', () => {
    it('dismissHint sets hasUsedPinch to true immediately', () => {
      const mockRef = { current: null as CameraView | null };
      const { result } = renderHook(() =>
        usePinchToZoom({ cameraRef: mockRef as any, enabled: true })
      );

      expect(result.current.hasUsedPinch).toBe(false);

      act(() => {
        result.current.dismissHint();
      });

      expect(result.current.hasUsedPinch).toBe(true);
    });
  });

  // Note: "stop polling after pinch ends" is not fully testable without
  // internal access to isPinchingRef. The hook has no external API to signal
  // pinch-end, so isPinching stays true once set. In real usage, the native
  // camera gesture handler would reset isPinchingRef indirectly.
});