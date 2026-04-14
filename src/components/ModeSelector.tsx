import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { CameraMode, ModeSelectorProps } from '../types';
export type { CameraMode };
export type { ModeSelectorProps };


const modeLabels: Record<CameraMode, string> = {
  photo: '拍照',
  scan: '扫码',
  video: '视频',
  portrait: '人像',
};

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    modeSelector: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(0,0,0,0.4)',
      gap: 4,
    },
    modeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginHorizontal: 4,
    },
    modeBtnActive: {
      backgroundColor: colors.accent,
    },
    modeBtnText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 13,
      fontWeight: '600',
    },
    modeBtnTextActive: {
      color: colors.primary,
    },
  });

  return (
    <View style={styles.modeSelector}>
      {(['photo', 'scan', 'video', 'portrait'] as CameraMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[styles.modeBtn, selectedMode === mode && styles.modeBtnActive]}
          onPress={() => onModeChange(mode)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeBtnText,
              selectedMode === mode && styles.modeBtnTextActive,
            ]}
          >
            {modeLabels[mode]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
