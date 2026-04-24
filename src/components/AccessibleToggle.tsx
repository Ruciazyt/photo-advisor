import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface AccessibleToggleProps {
  label: string;
  hint?: string;
  toggled: boolean;
  onPress: () => void;
  /**
   * Icon names for the on/off states.
   * @default { on: 'checkmark-circle', off: 'ellipse-outline' }
   */
  iconOn?: string;
  iconOff?: string;
  /**
   * Text shown for on/off states.
   * @default { on: '开', off: '关' }
   */
  textOn?: string;
  textOff?: string;
}

/**
 * An accessible toggle button used in SettingsScreen.
 * Announces state changes to screen readers and supports keyboard navigation.
 */
export function AccessibleToggle({
  label,
  hint,
  toggled,
  onPress,
  iconOn = 'checkmark-circle',
  iconOff = 'ellipse-outline',
  textOn = '开',
  textOff = '关',
}: AccessibleToggleProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        { backgroundColor: colors.cardBg, borderColor: toggled ? colors.accent : colors.border },
        toggled && { borderColor: colors.accent },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: toggled }}
      accessibilityHint={hint ?? (toggled ? `关闭${label}` : `打开${label}`)}
    >
      <Ionicons
        name={toggled ? iconOn : iconOff}
        size={20}
        color={toggled ? colors.accent : colors.textSecondary}
      />
      <Text style={[styles.toggleText, { color: toggled ? colors.accent : colors.textSecondary }]}>
        {toggled ? textOn : textOff}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minWidth: 60,
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
