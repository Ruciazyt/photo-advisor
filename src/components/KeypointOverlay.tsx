import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withRepeat, cancelAnimation } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import type { Keypoint, KeypointPosition, KeypointOverlayProps } from '../types';
import type { ReactNode } from 'react';
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
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Pop-in animation: spring from 0 → 1
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Pulse animation — run for 3 cycles then stop.
    // Each cycle: pulse from 1 → 1.3 (800ms) then 1.3 → 1 (800ms)
    // Total: 3 × 1600ms = 4800ms then stops naturally
    const oneCycle = withSequence(
      withTiming(1.3, { duration: 800 }),
      withTiming(1, { duration: 800 }),
    );
    pulse.value = withRepeat(oneCycle, -1, false);

    return () => {
      cancelAnimation(scale);
      cancelAnimation(pulse);
    };
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -MARKER_SIZE },
      { translateY: -MARKER_SIZE },
      { scale: scale.value },
    ],
    opacity: pulse.value === 1 ? 0.4 : 0, // simple approximation for mock
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

// Convert BubbleItem text to Keypoint
export function bubbleTextToKeypoint(text: string, id: number): Keypoint | null {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return null;

  const label = match[1].trim();
  const instruction = match[2].trim();

  const positionMap: Record<string, KeypointPosition> = {
    '左上': 'top-left',
    '右上': 'top-right',
    '左下': 'bottom-left',
    '右下': 'bottom-right',
    '中间': 'center',
  };

  let position: KeypointPosition = 'center';
  for (const [tag, pos] of Object.entries(positionMap)) {
    if (label.includes(tag)) {
      position = pos;
      break;
    }
  }

  return { id, label, position, instruction };
}
