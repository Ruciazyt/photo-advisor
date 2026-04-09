import React from 'react';
import { View, StyleSheet } from 'react-native';

export type GridVariant = 'thirds' | 'golden' | 'diagonal' | 'none';

interface GridOverlayProps {
  variant?: GridVariant;
}

export function GridOverlay({ variant = 'thirds' }: GridOverlayProps) {
  if (variant === 'none') return null;

  if (variant === 'thirds') {
    return (
      <View style={styles.overlay} pointerEvents="none">
        {/* Horizontal lines: 1/3 and 2/3 */}
        <View style={styles.h1} />
        <View style={styles.h2} />
        {/* Vertical lines: 1/3 and 2/3 */}
        <View style={styles.v1} />
        <View style={styles.v2} />
      </View>
    );
  }

  // Placeholder for unimplemented variants - render thirds as fallback
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.h1} />
      <View style={styles.h2} />
      <View style={styles.v1} />
      <View style={styles.v2} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  h1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  h2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  v1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  v2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
