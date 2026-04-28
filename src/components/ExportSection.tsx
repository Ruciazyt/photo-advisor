/**
 * Data Management Section - ExportSection component
 * Provides data backup, restore, and clear functionality in SettingsScreen.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ExportSectionProps {
  onExport: () => void;
  onImport: () => void;
  onClearAll: () => void;
}

export const ExportSection = memo(function ExportSection({
  onExport,
  onImport,
  onClearAll,
}: ExportSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>数据管理</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={onExport}
          activeOpacity={0.7}
          accessibilityLabel="导出数据"
          accessibilityRole="button"
        >
          <Ionicons name="upload-outline" size={20} color={colors.accent} />
          <Text style={[styles.buttonText, { color: colors.text }]}>导出数据</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={onImport}
          activeOpacity={0.7}
          accessibilityLabel="导入数据"
          accessibilityRole="button"
        >
          <Ionicons name="download-outline" size={20} color={colors.accent} />
          <Text style={[styles.buttonText, { color: colors.text }]}>导入数据</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={onClearAll}
          activeOpacity={0.7}
          accessibilityLabel="清空所有数据"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={colors.accent} />
          <Text style={[styles.buttonText, { color: colors.text }]}>清空所有</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});