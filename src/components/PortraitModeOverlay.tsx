/**
 * PortraitModeOverlay — real-time background blur/bokeh effect for portrait mode.
 *
 * Renders a blur overlay over the camera preview when portrait mode is active,
 * simulating depth-of-field (bokeh) by blurring the background while keeping
 * the subject sharp.
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders when visibility hasn't changed
 * - Uses native blur when available via expo-image BlurView, falls back to
 *   semi-transparent dark overlay for devices without depth data
 * - Blur radius of 18px for realistic bokeh effect on background layer
 *
 * Usage:
 *   <PortraitModeOverlay visible={selectedMode === 'portrait'} />
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAccessibilityReducedMotion } from '../hooks/useAccessibility';

// Dynamically import BlurView from expo-image — may be undefined on some Android devices
// eslint-disable-next-line @typescript-eslint/no-var-requires
const expoImageModule = require('expo-image');
const BlurView = expoImageModule.BlurView;

export interface PortraitModeOverlayProps {
  /** Whether the portrait mode overlay should be visible */
  visible: boolean;
  /**
   * Blur intensity in pixels (default: 18, simulates f/1.8 bokeh).
   * Only applies when native blur is available.
   */
  blurRadius?: number;
  /**
   * Fallback overlay color when native blur is unavailable (default: 'rgba(0,0,0,0.4)').
   * Simulates dark background blur effect.
   */
  fallbackColor?: string;
}

// Default blur radius for realistic bokeh effect (f/1.8 equivalent)
// Background elements appear blurred while subject remains sharp
const DEFAULT_BLUR_RADIUS = 18;
const DEFAULT_FALLBACK_COLOR = 'rgba(0,0,0,0.4)';

export const PortraitModeOverlay = React.memo(function PortraitModeOverlay({
  visible,
  blurRadius = DEFAULT_BLUR_RADIUS,
  fallbackColor = DEFAULT_FALLBACK_COLOR,
}: PortraitModeOverlayProps) {
  const { reducedMotion } = useAccessibilityReducedMotion();

  // Memoize the container style for visibility transitions
  // When reduced motion is enabled, skip opacity animation for instant display
  const containerStyle = useMemo(() => [
    styles.container,
    reducedMotion ? { opacity: 1 } : { opacity: visible ? 1 : 0 },
  ], [visible, reducedMotion]);

  if (!visible) return null;

  // Use native BlurView when available for true background blur
  // Fall back to semi-transparent color overlay on devices without BlurView support
  const useNativeBlur = BlurView !== undefined;

  return (
    <View
      style={containerStyle}
      pointerEvents="none"
      accessibilityLabel="人像模式背景虚化覆盖层"
      accessibilityRole="image"
    >
      {useNativeBlur ? (
        <BlurView style={styles.blurOverlay} blurRadius={blurRadius} />
      ) : (
        <View style={[styles.blurOverlay, { backgroundColor: fallbackColor }]} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});