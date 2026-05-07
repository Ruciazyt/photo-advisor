/**
 * usePinchToZoom — two-finger pinch gesture zoom control for CameraView
 *
 * expo-camera CameraView already handles native pinch-to-zoom on iOS and Android.
 * This hook provides:
 *   1. A stable `onPinchGesture` callback to pass to CameraView (required even if
 *      no-op, since some versions of expo-camera require the prop to be present).
 *   2. Zoom level tracking via polling of cameraRef.current.zoom.
 *   3. A `showPinchHint` setting — shown once when the user hasn't yet used pinch.
 *
 * Usage:
 *   const { onPinchGesture, zoomLevel, isPinching, hasUsedPinch, dismissHint } =
 *     usePinchToZoom({ cameraRef, enabled: showPinchToZoom });
 *   <CameraView ... onPinchGesture={onPinchGesture} />
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';

const POLL_INTERVAL_MS = 80;

export interface UsePinchToZoomOptions {
  cameraRef: React.RefObject<CameraView | null>;
  /** Enable/disable the pinch gesture tracking (default: true) */
  enabled?: boolean;
}

export interface UsePinchToZoomReturn {
  /**
   * Pass to CameraView's onPinchGesture prop.
   * No-op on this end — the native camera handles the actual zoom.
   */
  onPinchGesture: () => void;
  /** Live zoom level from polling (1.0 = no zoom) */
  zoomLevel: number;
  /** Whether a pinch gesture was just detected (true briefly after pinch starts) */
  isPinching: boolean;
  /** Whether the user has ever completed a pinch-to-zoom gesture */
  hasUsedPinch: boolean;
  /** Dismiss the first-time pinch hint */
  dismissHint: () => void;
}

export function usePinchToZoom({
  cameraRef,
  enabled = true,
}: UsePinchToZoomOptions): UsePinchToZoomReturn {
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPinching, setIsPinching] = useState(false);
  const [hasUsedPinch, setHasUsedPinch] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPinchingRef = useRef(false);
  const lastZoomRef = useRef(1.0);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      const cam = cameraRef.current as any;
      if (!cam) return;
      const z = typeof cam.zoom === 'number' ? cam.zoom : lastZoomRef.current;
      lastZoomRef.current = z;
      setZoomLevel(z);
    }, POLL_INTERVAL_MS);
  }, [cameraRef]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const onPinchGesture = useCallback(() => {
    if (!enabled) return;
    setIsPinching(true);
    isPinchingRef.current = true;
    startPolling();
  }, [enabled, startPolling]);

  // Detect pinch end by polling isPinching flag
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (!isPinchingRef.current && pollTimerRef.current) {
        stopPolling();
        setIsPinching(false);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      stopPolling();
    };
  }, [enabled, stopPolling]);

  // Mark hasUsedPinch when zoom changes away from 1.0 (user actually pinched)
  useEffect(() => {
    if (enabled && zoomLevel !== 1.0) {
      setHasUsedPinch(true);
    }
  }, [enabled, zoomLevel]);

  const dismissHint = useCallback(() => {
    setHasUsedPinch(true);
  }, []);

  return {
    onPinchGesture,
    zoomLevel,
    isPinching,
    hasUsedPinch,
    dismissHint,
  };
}