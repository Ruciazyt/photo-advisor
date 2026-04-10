import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';

interface CountdownOverlayProps {
  count: number; // current count value (3, 2, 1)
  onComplete: () => void;
}

/** Pulsing countdown number overlay.
 *  Animates a large digit that scales down and fades out each second. */
export function CountdownOverlay({ count, onComplete }: CountdownOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(1.4)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset and animate: scale from large → normal, opacity 1 → 0.3
    scaleAnim.setValue(1.4);
    opacityAnim.setValue(1);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, scaleAnim, opacityAnim]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.number}>{count}</Text>
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
    backgroundColor: 'rgba(232,213,183,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  number: {
    color: '#000000',
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
});
