import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface AccessibleToggleProps {
  /** Screen-reader label for the toggle button */
  label: string;
  /** Screen-reader hint describing the action */
  hint: string;
  /** Whether the toggle is in the ON state */
  toggled: boolean;
  /** Callback when the toggle is pressed */
  onPress: () => void;
  /** Whether the toggle is disabled (default: false) */
  disabled?: boolean;
}

/**
 * A reusable accessible toggle button used in SettingsScreen.
 *
 * Wraps a TouchableOpacity with full VoiceOver/TalkBack props:
 * - accessibilityLabel: the feature name
 * - accessibilityRole: 'switch' (communicates ON/OFF semantically)
 * - accessibilityState: { checked: toggled }
 * - accessibilityHint: what will happen when activated
 */
export function AccessibleToggle({ label, hint, toggled, onPress, disabled = false }: AccessibleToggleProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress();
  }, [onPress, disabled]);

  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        {
          backgroundColor: colors.cardBg,
          borderColor: disabled ? colors.border : toggled ? colors.accent : colors.border,
          opacity: disabled ? 0.4 : 1.0,
        },
      ]}
      onPress={handlePress}
      activeOpacity={disabled ? 1.0 : 0.7}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: toggled, disabled }}
      accessibilityHint={hint}
    >
      <Ionicons
        name={toggled ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={disabled ? colors.textSecondary : toggled ? colors.accent : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
});
