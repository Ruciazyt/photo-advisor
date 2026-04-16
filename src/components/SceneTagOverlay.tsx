import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface SceneTagOverlayProps {
  /** The scene tag to display (e.g. "风光", "人像"), null/empty renders nothing */
  tag: string | null;
  /** Whether the overlay is visible */
  visible: boolean;
}

/**
 * Pill-shaped badge overlay showing the recognized scene type.
 * Positioned at the top-center area of the screen.
 * If tag is null or empty, renders nothing.
 */
// Module-level static styles
const containerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    zIndex: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  label: {
    fontSize: 14,
    marginRight: 6,
  },
});

export function SceneTagOverlay({ tag, visible }: SceneTagOverlayProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  const staticTagStyles = { fontSize: 15, fontWeight: '600' as const, letterSpacing: 1 };
  // Theme-dependent tag text style — use useMemo
  const tagStyle = useMemo(() => [
    staticTagStyles,
    { color: colors.accent },
  ], [colors.accent]);

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, { duration: 300 });
      return;
    }
    opacity.value = withTiming(1, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!tag) return null;

  return (
    <Animated.View style={[containerStyles.container, animatedStyle]} pointerEvents="none">
      <View style={containerStyles.badge}>
        <Text style={containerStyles.label}>📷</Text>
        <Text style={tagStyle}>{tag}</Text>
      </View>
    </Animated.View>
  );
}
