import React, { useMemo } from 'react';
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
  activeBtnStyle: object[];
  activeTextStyle: object[];
  unselectedTextStyle: object[];
}

function ModeButton({ mode, isSelected, onPress, activeBtnStyle, activeTextStyle, unselectedTextStyle }: ModeButtonProps) {
  const { colors } = useTheme();
  const a11y = useAccessibilityButton({
    label: `${modeLabels[mode]}模式`,
    hint: `切换到${modeLabels[mode]}模式`,
    role: 'tab',
  });

  return (
    <TouchableOpacity
      style={[staticStyles.modeBtn, isSelected && activeBtnStyle]}
      onPress={onPress}
      activeOpacity={0.7}
      {...a11y}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[staticStyles.modeBtnText, isSelected ? activeTextStyle : unselectedTextStyle]}>
        {modeLabels[mode]}
      </Text>
    </TouchableOpacity>
  );
}

// Module-level static styles
const staticStyles = StyleSheet.create({
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  const { colors } = useTheme();

  const activeBtnStyle = useMemo(() => [
    staticStyles.modeBtn,
    { backgroundColor: colors.accent },
  ], [colors.accent]);
  const activeTextStyle = useMemo(() => [
    staticStyles.modeBtnText,
    { color: colors.primary },
  ], [colors.primary]);
  const unselectedTextStyle = useMemo(() => [
    staticStyles.modeBtnText,
    { color: colors.modeSelectorUnselected },
  ], [colors.modeSelectorUnselected]);

  return (
    <View style={[staticStyles.modeSelector, { backgroundColor: colors.modeSelectorBg }]}>
      {(['photo', 'scan', 'video', 'portrait'] as CameraMode[]).map((mode) => (
        <ModeButton
          key={mode}
          mode={mode}
          isSelected={selectedMode === mode}
          onPress={() => onModeChange(mode)}
          activeBtnStyle={activeBtnStyle}
          activeTextStyle={activeTextStyle}
          unselectedTextStyle={unselectedTextStyle}
        />
      ))}
    </View>
  );
}
