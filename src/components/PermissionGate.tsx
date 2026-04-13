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

export function PermissionGate({ title, icon, message, buttonText, onRequest, loading }: PermissionGateProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 40,
    },
    title: {
      color: colors.accent,
      fontSize: 20,
      fontWeight: '700',
      marginTop: 20,
      marginBottom: 12,
    },
    message: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
    },
    button: {
      marginTop: 24,
      backgroundColor: colors.accent,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 30,
      minWidth: 140,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '700',
    },
  });

  return (
    <View style={styles.container}>
      {icon && <Ionicons name={icon} size={64} color={colors.accent} />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRequest} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={styles.buttonText}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
