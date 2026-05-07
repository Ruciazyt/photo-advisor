/**
 * PinchHintOverlay — first-time hint shown when pinch-to-zoom is available but
 * the user hasn't used it yet.
 *
 * Displays a pinch gesture icon + "Pinch to zoom" text that fades out after
 * dismissal or when the user performs a pinch gesture.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PinchHintOverlayProps {
  /** Show the hint overlay */
  visible: boolean;
  /** Called when the user dismisses the hint (tap or auto-dismiss) */
  onDismiss: () => void;
}

const FADE_DURATION_MS = 250;

export function PinchHintOverlay({ visible, onDismiss }: PinchHintOverlayProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  // Guard: do not call onDismiss if the overlay was hidden before the auto-dismiss fires.
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Cleanup: guard against stale onDismiss when visible flips to false
    return () => {
      mounted.current = false;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      mounted.current = true;
      opacity.value = withTiming(1, { duration: FADE_DURATION_MS }, (finished) => {
        'worklet';
        if (!finished || !mounted.current) return;
        // Auto-dismiss after 3 seconds of being shown
        runOnJS(setTimeout)(() => {
          if (!mounted.current) return;
          opacity.value = withTiming(0, { duration: FADE_DURATION_MS }, (fadeFinished) => {
            'worklet';
            if (fadeFinished && mounted.current) runOnJS(onDismiss)();
          });
        }, 3000);
      });
    } else {
      opacity.value = withTiming(0, { duration: FADE_DURATION_MS });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="box-none"
    >
      <View style={[styles.bubble, { backgroundColor: colors.overlayBg }]}>
        <Ionicons name="contract-outline" size={22} color={colors.accent} />
        <Text style={[styles.text, { color: colors.text }]}>Pinch to zoom</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    zIndex: 20,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
