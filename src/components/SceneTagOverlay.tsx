import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
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
export function SceneTagOverlay({ tag, visible }: SceneTagOverlayProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  const styles = StyleSheet.create({
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
    tag: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 1,
    },
  });

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }
    // Fade in quickly
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!tag) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={styles.badge}>
        <Text style={styles.label}>📷</Text>
        <Text style={styles.tag}>{tag}</Text>
      </View>
    </Animated.View>
  );
}
