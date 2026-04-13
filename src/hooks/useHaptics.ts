import { useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

const LEVEL_HAPTIC_COOLDOWN_MS = 1500; // min interval between level haptic triggers

/**
 * Haptic feedback hook for the camera app.
 * Provides level-confirmation haptics and general UI feedback.
 */
export function useHaptics() {
  const lastLevelHapticRef = useRef<number>(0);

  /**
   * Trigger a light "you are level" haptic.
   * Respects a cooldown to avoid spamming vibrations.
   */
  const triggerLevelHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastLevelHapticRef.current < LEVEL_HAPTIC_COOLDOWN_MS) return;
    lastLevelHapticRef.current = now;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /**
   * Light impact — for button presses and toggles.
   */
  const lightImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  /**
   * Medium impact — for important actions like capture, burst start.
   */
  const mediumImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  /**
   * Heavy impact — for shutter/capture confirmation.
   */
  const heavyImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  /**
   * Success notification — for favorable states like "level achieved" or score > 80.
   */
  const successNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /**
   * Warning notification — for tilt warning or exposure warning.
   */
  const warningNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  /**
   * Error notification — for errors.
   */
  const errorNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  return {
    triggerLevelHaptic,
    lightImpact,
    mediumImpact,
    heavyImpact,
    successNotification,
    warningNotification,
    errorNotification,
  };
}
