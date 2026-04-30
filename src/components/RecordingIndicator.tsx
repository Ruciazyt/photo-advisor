import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface RecordingIndicatorProps {
  isRecording: boolean;
  durationSeconds: number;
}

/** Recording indicator overlay showing "🔴 REC 00:32" style indicator. */
export function RecordingIndicator({ isRecording, durationSeconds }: RecordingIndicatorProps) {
  const { colors } = useTheme();

  if (!isRecording) return null;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.overlayBg }]} pointerEvents="none">
      <View style={styles.badge}>
        <Text style={styles.dot}>🔴</Text>
        <Text style={[styles.recText, { color: colors.text }]}>REC</Text>
        <Text style={[styles.timer, { color: colors.text }]}>{timeStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    fontSize: 14,
  },
  recText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timer: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
