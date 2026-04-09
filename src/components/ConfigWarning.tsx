import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface ConfigWarningProps {
  visible?: boolean;
}

export function ConfigWarning({ visible = true }: ConfigWarningProps) {
  if (!visible) return null;

  return (
    <View style={styles.warning}>
      <Text style={styles.text}>⚠️ 请先配置API</Text>
    </View>
  );
}

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
    color: Colors.accent,
    fontSize: 13,
  },
});
