import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import type { Keypoint, KeypointPosition, KeypointOverlayProps } from '../types';

// Shared parsing utilities
import { parseKeypointFromText, labelToKeypointPosition } from '../utils/parsing';

export type { KeypointPosition } from '../types';
export type { Keypoint } from '../types';

// Rule-of-thirds intersection points (fraction of screen)
const POSITION_COORDS: Record<KeypointPosition, { x: number; y: number }> = {
  'top-left':     { x: 0.33, y: 0.33 },
  'top-right':    { x: 0.67, y: 0.33 },
  'bottom-left':  { x: 0.33, y: 0.67 },
  'bottom-right': { x: 0.67, y: 0.67 },
  'center':       { x: 0.5,  y: 0.5  },
};

// Module-level constants
const MARKER_SIZE = 40;

// Module-level static styles (no theme dependency)
const staticStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -MARKER_SIZE / 2 }, { translateY: -MARKER_SIZE / 2 }],
  },
  pulseRing: {
    position: 'absolute',
    width: MARKER_SIZE * 2,
    height: MARKER_SIZE * 2,
    borderRadius: MARKER_SIZE,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  instructionBadge: {
    position: 'absolute',
    top: MARKER_SIZE + 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  instructionText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 14,
  },
});

// Rule-of-thirds intersection points exported for unit testing
export { POSITION_COORDS };

export function KeypointOverlay({ keypoints, visible }: KeypointOverlayProps) {
  const { colors } = useTheme();

  // Theme-dependent styles — useMemo
  const accentStyles = useMemo(() => ({
    pulseRing: [staticStyles.pulseRing, { borderColor: colors.accent }],
    marker: [staticStyles.marker, { borderColor: colors.accent }],
    markerLabel: [staticStyles.markerLabel, { color: colors.accent }],
  }), [colors.accent]);

  // Stable render — only show when actually needed
  const renderKeypoints = useCallback(() => {
    if (!visible || keypoints.length === 0) return null;
    return (
      <View style={staticStyles.container} pointerEvents="box-none">
        {keypoints.map((kp) => (
          <MemoizedKeypointMarker
            key={kp.id}
            keypoint={kp}
            accentStyles={accentStyles}
          />
        ))}
      </View>
    );
  }, [visible, keypoints, accentStyles]);

  return renderKeypoints();
}

// Memoized marker — avoids re-render when parent re-renders with same props
const MemoizedKeypointMarker = React.memo(function KeypointMarker({
  keypoint,
  accentStyles,
}: {
  keypoint: Keypoint;
  accentStyles: {
    pulseRing: object[];
    marker: object[];
    markerLabel: object[];
  };
}) {
  // Shared values on the UI thread
  const scale = useSharedValue(0);
  // pulseValue: 1 → 1.3 → 1 over 1600ms, loops 3 times (4800ms total)
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    // Pop-in animation: spring from 0 → 1
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Pulse animation — run for 3 cycles then stop.
    // Each cycle: pulse from 1 → 1.3 (800ms) then 1.3 → 1 (800ms)
    const oneCycle = withSequence(
      withTiming(1.3, { duration: 800 }),
      withTiming(1,   { duration: 800 }),
    );
    // Run exactly 3 cycles then stop (mirrored=false = no reverse on last)
    pulseValue.value = withRepeat(oneCycle, 3, false);

    return () => {
      cancelAnimation(scale);
      cancelAnimation(pulseValue);
    };
  }, []);

  // Ring opacity: fades from 0.4 at rest to 0 at peak expansion
  // pulseValue goes 1 → 1.3 → 1, so map [1, 1.3] → [0.4, 0]
  const pulseOpacity = useDerivedValue(() => {
    const raw = (pulseValue.value - 1) / (1.3 - 1); // 0 at rest, 1 at peak
    return 0.4 * (1 - raw); // 0.4 → 0 as pulse grows
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -MARKER_SIZE },
      { translateY: -MARKER_SIZE },
      { scale: scale.value },
    ],
    opacity: pulseOpacity.value,
  }));

  const markerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), []);

  const coords = POSITION_COORDS[keypoint.position];

  return (
    <View
      style={[
        staticStyles.markerContainer,
        {
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
        },
      ]}
      pointerEvents="none"
    >
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          accentStyles.pulseRing,
          pulseAnimatedStyle,
        ]}
      />
      {/* Inner circle */}
      <Animated.View
        style={[
          accentStyles.marker,
          markerAnimatedStyle,
        ]}
      >
        <Text style={accentStyles.markerLabel}>{keypoint.label}</Text>
      </Animated.View>
      {/* Instruction text below marker */}
      {keypoint.instruction && (
        <View style={staticStyles.instructionBadge}>
          <Text style={staticStyles.instructionText} numberOfLines={2}>
            {keypoint.instruction}
          </Text>
        </View>
      )}
    </View>
  );
});

// Backward-compatible alias using the shared parser
export function bubbleTextToKeypoint(text: string, id: number): Keypoint | null {
  return parseKeypointFromText(text, id);
}
