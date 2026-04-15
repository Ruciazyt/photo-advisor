import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ConfigWarningProps {
  visible?: boolean;
}

// Module-level static styles (no theme dependency)
const containerStyles = StyleSheet.create({
  warning: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'center',
    marginTop: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
});

export function ConfigWarning({ visible = true }: ConfigWarningProps) {
  const { colors } = useTheme();
  if (!visible) return null;

  // Theme-dependent text style — use useMemo to avoid re-creation on every render
  const textStyle = useMemo(() => [
    { color: colors.accent, fontSize: 13 },
  ], [colors.accent]);

  return (
    <View style={containerStyles.warning}>
      <Text style={textStyle}>⚠️ 请先配置API</Text>
    </View>
  );
}
