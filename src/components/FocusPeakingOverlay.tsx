/**
 * FocusPeakingOverlay — real-time in-focus edge highlighter
 *
 * Renders semi-transparent coloured dots over parts of the camera preview
 * that have sharp (high-gradient) edges, helping the user identify what's
 * in focus when using manual focus.
 *
 * Performance optimizations:
 * - React.memo on both FocusPeakingOverlay and DotMarkers to prevent unnecessary re-renders
 * - useRef for dots array provides stable reference, avoiding array allocation on parent re-renders
 * - useEffect with content-change detection updates dots only when peaks actually change
 * - Imperative ref updates bypass React's diffing for the dots array
 *
 * Usage:
 *   <FocusPeakingOverlay
 *     visible={showFocusPeaking}
 *     peaks={peakPoints}
 *     screenWidth={width}
 *     screenHeight={height}
 *   />
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { PeakPoint, FocusPeakingOverlayProps } from '../types';
export type { FocusPeakingOverlayProps };

const DOT_SIZE = 3; // base dot diameter in px before scaling

// Stable empty array to avoid creating new arrays on re-renders
const EMPTY_DOTS: Array<{ key: number; style: object[] }> = [];

// Pure component for rendering dots — receives dots as a stable prop
// Memoized to only re-render when dots content actually changes
const DotMarkers = React.memo(
  function DotMarkers({
    dots,
  }: {
    dots: Array<{ key: number; style: object[] }>;
  }) {
    return (
      <>
        {dots.map(dot => (
          <View key={dot.key} style={dot.style} pointerEvents="none" />
        ))}
      </>
    );
  },
  // Custom areEqual: only re-render when dots array reference actually changes
  (prev, next) => prev.dots === next.dots
);

// Dummy component that receives a stable empty array prop
// It only re-renders when its prop actually changes, not when parent state changes
const Dummy = React.memo(function Dummy({
  dots,
}: {
  dots: Array<{ key: number; style: object[] }>;
}) {
  return <DotMarkers dots={dots} />;
});

export const FocusPeakingOverlay = React.memo(function FocusPeakingOverlay({
  visible,
  peaks,
  screenWidth,
  screenHeight,
  color,
}: FocusPeakingOverlayProps) {
  const { colors } = useTheme();
  const peakingColor = color ?? colors.error; // red for peaking by default

  // Stable ref to the dots array — avoids creating new arrays on every render
  const dotsRef = useRef<Array<{ key: number; style: object[] }>>(EMPTY_DOTS);

  // Stable ref for dots version counter — avoids Date.now() object allocation
  const dotsVersionRef = useRef(0);

  // Dummy state to force re-render when dots need to update
  // Using an object reference allows React.memo on Dummy to work correctly
  const [, setDotsVersion] = useState<{ v: number }>({ v: 0 });

  // Track previous peaks hash to detect actual content changes
  const prevPeaksHashRef = useRef<string>('');

  // Compute a simple hash of peaks content for change detection
  const computePeaksHash = (pts: PeakPoint[]): string => {
    if (pts.length === 0) return 'empty';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `${pts.length}-${first.x.toFixed(4)}-${first.y.toFixed(4)}-${first.strength.toFixed(4)}-${last.x.toFixed(4)}-${last.y.toFixed(4)}`;
  };

  // Imperatively update dots ref only when peaks content actually changes
  useEffect(() => {
    if (!visible || peaks.length === 0) {
      if (dotsRef.current.length !== 0) {
        dotsRef.current = EMPTY_DOTS;
        setDotsVersion({ v: ++dotsVersionRef.current }); // Force re-render with incremented counter
      }
      prevPeaksHashRef.current = '';
      return;
    }

    const newHash = computePeaksHash(peaks);
    if (newHash === prevPeaksHashRef.current) {
      return; // No actual change, skip update
    }
    prevPeaksHashRef.current = newHash;

    // Build new dots array imperatively
    const newDots = peaks.map((peak, i) => {
      const px = peak.x * screenWidth;
      const py = peak.y * screenHeight;
      const size = DOT_SIZE + peak.strength * 3; // stronger peaks get slightly bigger dots

      return {
        key: i,
        // Style as array to match React Native StyleSheet composition pattern
        style: [
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
        ],
      };
    });

    dotsRef.current = newDots;
    setDotsVersion({ v: Date.now() }); // Force re-render with new ref
  }, [visible, peaks, screenWidth, screenHeight, peakingColor]);

  // Early return if not visible or no dots
  if (!visible || dotsRef.current.length === 0) return null;

  // Dummy passes a stable empty array to DotMarkers, only changing when dotsRef actually changes
  return (
    <View style={styles.container} pointerEvents="none">
      {dotsRef.current.length === 0 ? (
        <Dummy dots={EMPTY_DOTS} />
      ) : (
        <Dummy dots={dotsRef.current} />
      )}
    </View>
  );
});

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
