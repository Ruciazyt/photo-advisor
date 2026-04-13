import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ConfigWarningProps {
  visible?: boolean;
}

export function ConfigWarning({ visible = true }: ConfigWarningProps) {
  const { colors } = useTheme();
  if (!visible) return null;

  const styles = StyleSheet.create({
    warning: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignSelf: 'center',
      marginTop: 60,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      zIndex: 10,
    },
    text: {
      color: colors.accent,
      fontSize: 13,
    },
  });

  return (
    <View style={styles.warning}>
      <Text style={styles.text}>⚠️ 请先配置API</Text>
    </View>
  );
}
