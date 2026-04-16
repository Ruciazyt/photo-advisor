import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement } from '../hooks/useAccessibility';

interface CountdownOverlayProps {
  count: number; // current count value (3, 2, 1)
  onComplete: () => void;
}

/** Pulsing countdown number overlay.
 *  Animates a large digit that scales down and fades out each second. */
export function CountdownOverlay({ count, onComplete }: CountdownOverlayProps) {
  const { colors } = useTheme();
  const { announce } = useAccessibilityAnnouncement();
  const scale = useSharedValue(1.4);
  const opacity = useSharedValue(1);
  const prevCountRef = { current: null as number | null };

  // Announce count change
  useEffect(() => {
    if (prevCountRef.current !== count) {
      announce(count + '秒', 'assertive');
      prevCountRef.current = count;
    }
  }, [count]);

  // Reset and animate on count change
  useEffect(() => {
    // withSpring starts from current value (1.4 from previous cycle end)
    opacity.value = 1;
    scale.value = withSpring(1, { damping: 3, stiffness: 100 });
    opacity.value = withTiming(0.3, { duration: 900 });
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.countdownBg,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bubble: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  number: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
});
