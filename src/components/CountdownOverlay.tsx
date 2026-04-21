import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement } from '../hooks/useAccessibility';

// ---- 60fps animation constants ----
// Use withTiming (not withSpring) for predictable, smooth easing.
// Duration tuned to divide evenly into 60fps frames (multiples of ~16.67ms).
const SCALE_DURATION_MS = 400;  // 24 frames @ 60fps — smooth ease-out pop
const FADE_DURATION_MS = 900;   // 54 frames @ 60fps — gentle fade per second
const SCALE_TARGET = 1.0;
const OPACITY_TARGET = 0.3;

interface CountdownOverlayProps {
  count: number; // current count value (3, 2, 1)
  onComplete: () => void;
}

/** Pulsing countdown number overlay.
 *  Animates a large digit that scales down and fades out each second.
 *  Optimized for 60fps: uses withTiming (not underdamped withSpring),
 *  durations are even multiples of ~16.67ms per frame. */
export function CountdownOverlay({ count, onComplete }: CountdownOverlayProps) {
  const { colors } = useTheme();
  const { announce } = useAccessibilityAnnouncement();
  // Scale starts at 1.4 (pop-in from previous cycle), eases to 1
  const scale = useSharedValue(1.4);
  // Opacity fades from 1 → 0.3 over the countdown duration
  const opacity = useSharedValue(1);
  const prevCountRef = useRef<number | null>(null);

  // Announce count change
  useEffect(() => {
    if (prevCountRef.current !== count) {
      announce(count + '秒', 'assertive');
      prevCountRef.current = count;
    }
  }, [count]);

  // Reset and animate on count change
  useEffect(() => {
    // Cancel any in-flight animations so they don't conflict
    cancelAnimation(scale);
    cancelAnimation(opacity);
    // Use withTiming for smooth, predictable 60fps animation.
    // Previous damping:3 spring was underdamped → excessive oscillation.
    scale.value = withTiming(SCALE_TARGET, {
      duration: SCALE_DURATION_MS,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withTiming(OPACITY_TARGET, {
      duration: FADE_DURATION_MS,
      easing: Easing.out(Easing.ease),
    });
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.overlayBg }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.countdownBg,
            borderColor: colors.countdownBorder,
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.number, { color: colors.countdownText }]}>{count}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  bubble: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  number: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
});
