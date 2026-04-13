import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useDeviceOrientation, DeviceOrientation } from '../hooks/useDeviceOrientation';

const MAX_TILT = 20; // degrees beyond which we consider "严重倾斜"
const MID_TILT = 8;  // degrees for "轻微倾斜"
const BUBBLE_RADIUS = 35; // pixels, the movement radius of the bubble

function getLevelState(tilt: number): 'level' | 'slight' | 'tilted' {
  const abs = Math.abs(tilt);
  if (abs <= MID_TILT) return 'level';
  if (abs <= MAX_TILT) return 'slight';
  return 'tilted';
}

function getColor(state: 'level' | 'slight' | 'tilted', colors: { success: string; error: string }): string {
  if (state === 'level') return colors.success;
  if (state === 'slight') return '#FFD700'; // gold
  return colors.error;
}

interface BubbleDotProps {
  pitch: number;
  roll: number;
  color: string;
}

function BubbleDot({ pitch, roll, color }: BubbleDotProps) {
  const clampedPitch = Math.max(-MAX_TILT, Math.min(MAX_TILT, pitch));
  const clampedRoll = Math.max(-MAX_TILT, Math.min(MAX_TILT, roll));

  const offsetX = (clampedRoll / MAX_TILT) * BUBBLE_RADIUS;
  const offsetY = (clampedPitch / MAX_TILT) * BUBBLE_RADIUS;

  return (
    <View style={styles.bubbleContainer} pointerEvents="none">
      {/* Outer ring */}
      <View style={[styles.outerRing, { borderColor: color }]}>
        {/* Cross hairs */}
        <View style={styles.crossH} />
        <View style={styles.crossV} />
        {/* Center target */}
        <View style={[styles.centerTarget, { borderColor: color }]} />
        {/* Bubble dot */}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: color,
              transform: [{ translateX: offsetX }, { translateY: offsetY }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export function LevelIndicator() {
  const { colors } = useTheme();
  const { orientation, available } = useDeviceOrientation(80);

  if (!available) {
    return null;
  }

  const pitchState = getLevelState(orientation.pitch);
  const rollState = getLevelState(orientation.roll);
  const worstState = pitchState === 'tilted' || rollState === 'tilted'
    ? 'tilted'
    : pitchState === 'slight' || rollState === 'slight'
    ? 'slight'
    : 'level';
  const color = getColor(worstState, colors);

  const statusText =
    worstState === 'level'
      ? '水平'
      : worstState === 'slight'
      ? '轻微倾斜'
      : '倾斜';

  const statusIcon =
    worstState === 'level'
      ? 'checkmark-circle'
      : worstState === 'slight'
      ? 'alert-circle'
      : 'close-circle';

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.indicatorRow}>
        <BubbleDot pitch={orientation.pitch} roll={orientation.roll} color={color} />
        <View style={styles.infoPanel}>
          <Ionicons name={statusIcon} size={18} color={color} />
          <Text style={[styles.statusText, { color }]}>{statusText}</Text>
          <Text style={styles.tiltLabel}>
            俯仰 {orientation.pitch.toFixed(1)}°
          </Text>
          <Text style={styles.tiltLabel}>
            横滚 {orientation.roll.toFixed(1)}°
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bubbleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  crossH: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: -0.5,
  },
  crossV: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: -0.5,
  },
  centerTarget: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    position: 'absolute',
  },
  bubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  infoPanel: {
    alignItems: 'flex-start',
    gap: 2,
    minWidth: 80,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tiltLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '400',
  },
});
