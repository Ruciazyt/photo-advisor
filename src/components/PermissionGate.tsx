import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PermissionGateProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  buttonText: string;
  onRequest: () => void;
  loading?: boolean;
}

// Module-level static styles
const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export function PermissionGate({ title, icon, message, buttonText, onRequest, loading }: PermissionGateProps) {
  const { colors } = useTheme();

  const titleStyle = [staticStyles.title, { color: colors.accent }];
  const messageStyle = [staticStyles.message, { color: colors.textSecondary }];
  const buttonStyle = [staticStyles.button, { backgroundColor: colors.accent }];
  const buttonTextStyle = [staticStyles.buttonText, { color: colors.primary }];

  return (
    <View style={[staticStyles.container, { backgroundColor: colors.primary }]}>
      {icon && <Ionicons name={icon} size={64} color={colors.accent} />}
      <Text style={titleStyle}>{title}</Text>
      <Text style={messageStyle}>{message}</Text>
      <TouchableOpacity style={buttonStyle} onPress={onRequest} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={buttonTextStyle}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
