import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { CameraMode, ModeSelectorProps } from '../types';
import { useAccessibilityButton } from '../hooks/useAccessibility';
export type { CameraMode };
export type { ModeSelectorProps };


const modeLabels: Record<CameraMode, string> = {
  photo: '拍照',
  scan: '扫码',
  video: '视频',
  portrait: '人像',
};

interface ModeButtonProps {
  mode: CameraMode;
  isSelected: boolean;
  onPress: () => void;
}

function ModeButton({ mode, isSelected, onPress }: ModeButtonProps) {
  const { colors } = useTheme();
  const a11y = useAccessibilityButton({
    label: `${modeLabels[mode]}模式`,
    hint: `切换到${modeLabels[mode]}模式`,
    role: 'tab',
  });

  return (
    <TouchableOpacity
      style={[styles.modeBtn, isSelected && styles.modeBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
      {...a11y}
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[
          styles.modeBtnText,
          isSelected && styles.modeBtnTextActive,
        ]}
      >
        {modeLabels[mode]}
      </Text>
    </TouchableOpacity>
  );
}

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
        <ModeButton
          key={mode}
          mode={mode}
          isSelected={selectedMode === mode}
          onPress={() => onModeChange(mode)}
        />
      ))}
    </View>
  );
}
