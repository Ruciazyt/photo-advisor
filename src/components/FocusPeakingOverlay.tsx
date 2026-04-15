/**
 * FocusPeakingOverlay — real-time in-focus edge highlighter
 *
 * Renders semi-transparent coloured dots over parts of the camera preview
 * that have sharp (high-gradient) edges, helping the user identify what's
 * in focus when using manual focus.
 *
 * Usage:
 *   <FocusPeakingOverlay
 *     visible={showFocusPeaking}
 *     peaks={peakPoints}
 *     screenWidth={width}
 *     screenHeight={height}
 *   />
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { PeakPoint, FocusPeakingOverlayProps } from '../types';
export type { FocusPeakingOverlayProps };

const DOT_SIZE = 3; // base dot diameter in px before scaling

export function FocusPeakingOverlay({
  visible,
  peaks,
  screenWidth,
  screenHeight,
  color,
}: FocusPeakingOverlayProps) {
  const { colors } = useTheme();
  const peakingColor = color ?? colors.error; // red for peaking by default
  const dots = useMemo(() => {
    if (!visible || peaks.length === 0) return [];

    return peaks.map((peak, i) => {
      const px = peak.x * screenWidth;
      const py = peak.y * screenHeight;
      const size = DOT_SIZE + peak.strength * 3; // stronger peaks get slightly bigger dots

      return (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: peakingColor,
              opacity: Math.max(0.3, peak.strength * 0.85),
            },
          ]}
          pointerEvents="none"
        />
      );
    });
  }, [visible, peaks, screenWidth, screenHeight, peakingColor]);

  if (!visible || dots.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {dots}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 25,
  },
  dot: {
    position: 'absolute',
  },
});
