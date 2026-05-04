/**
 * useShakeDetector — detect shake gestures via accelerometer
 *
 * Uses expo-sensors Accelerometer to detect a rapid shake pattern
 * (configurable threshold). When a shake is detected, calls onShake.
 *
 * Usage:
 *   const { startListening, stopListening } = useShakeDetector({
 *     onShake: () => { bubbleChatDismissAll(); handleDismissAll(); },
 *     enabled: showBubbleChat,
 *   });
 */

import { useEffect, useRef, useCallback } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import type { EventSubscription as Subscription } from 'expo-modules-core';

export interface UseShakeDetectorOptions {
  /** Called when a shake is detected */
  onShake: () => void;
  /** Only listen when enabled (e.g., while bubble chat is visible) */
  enabled?: boolean;
  /**
   * Acceleration magnitude that qualifies as a "shake" event.
   * Default 1.8 (g-force). Higher = more violent shake required.
   */
  threshold?: number;
  /**
   * Number of consecutive above-threshold samples to confirm a shake.
   * Default 3 — prevents accidental triggers from single bumps.
   */
  consecutiveCount?: number;
  /**
   * Reset shake detection after this many ms of no movement.
   * Default 500ms.
   */
  resetIntervalMs?: number;
  /**
   * Optional voice feedback to speak when shake is detected.
   * Called immediately after onShake (before debounce reset).
   */
  onShakeVoiceFeedback?: () => void;
}

const DEFAULT_THRESHOLD = 1.8;
const DEFAULT_CONSECUTIVE = 3;
const DEFAULT_RESET_MS = 500;
const SAMPLING_INTERVAL = 50; // ms between accelerometer reads

export interface UseShakeDetectorReturn {
  /** Start listening for shake events */
  startListening: () => void;
  /** Stop listening (call when disabled) */
  stopListening: () => void;
}

export function useShakeDetector({
  onShake,
  enabled = true,
  threshold = DEFAULT_THRESHOLD,
  consecutiveCount = DEFAULT_CONSECUTIVE,
  resetIntervalMs = DEFAULT_RESET_MS,
  onShakeVoiceFeedback,
}: UseShakeDetectorOptions): UseShakeDetectorReturn {
  const consecutiveRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const subscriptionRef = useRef<Subscription | null>(null);

  const handleAccelerometerData = useCallback(
    (event: AccelerometerMeasurement) => {
      const { x, y, z } = event;
      if (x == null || y == null || z == null) return;

      // Magnitude of acceleration vector (1g = standing still due to gravity)
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude > threshold) {
        consecutiveRef.current += 1;

        if (consecutiveRef.current >= consecutiveCount) {
          const now = Date.now();
          // Debounce: ignore if last shake was less than resetIntervalMs ago
          if (now - lastShakeTimeRef.current > resetIntervalMs) {
            lastShakeTimeRef.current = now;
            consecutiveRef.current = 0;
            onShake();
            onShakeVoiceFeedback?.();
          }
        }
      } else {
        // Reset consecutive counter after resetIntervalMs of no activity
        const timeSinceLastShake = Date.now() - lastShakeTimeRef.current;
        if (timeSinceLastShake > resetIntervalMs) {
          consecutiveRef.current = 0;
        }
      }
    },
    [onShake, threshold, consecutiveCount, resetIntervalMs]
  );

  const startListening = useCallback(() => {
    if (subscriptionRef.current) return; // already listening

    Accelerometer.setUpdateInterval(SAMPLING_INTERVAL);
    subscriptionRef.current = Accelerometer.addListener(handleAccelerometerData);
  }, [handleAccelerometerData]);

  const stopListening = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    consecutiveRef.current = 0;
  }, []);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, startListening, stopListening]);

  return { startListening, stopListening };
}
