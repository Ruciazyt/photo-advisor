import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FOCUS_ZONES } from './FocusGuideOverlay';

export interface FocusZoneSelectorProps {
  visible: boolean;
  onSelect: (depth: number) => void;
  onClose: () => void;
}

export function FocusZoneSelector({ visible, onSelect, onClose }: FocusZoneSelectorProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} testID="focus-zone-backdrop">
        <View style={[styles.panel, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Ionicons name="camera" size={18} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>选择对焦区域</Text>
          </View>

          <View style={styles.zones}>
            {FOCUS_ZONES.map(zone => (
              <TouchableOpacity
                key={zone.label}
                style={[styles.zoneBtn, { backgroundColor: colors.modeSelectorBg, borderColor: colors.border }]}
                onPress={() => onSelect(zone.depth)}
                activeOpacity={0.75}
              >
                <Text style={[styles.zoneLabel, { color: colors.text }]}>{zone.label}</Text>
                <Text style={[styles.zoneSub, { color: colors.textSecondary }]}>{zone.sub}</Text>
                <Text style={[styles.zoneDesc, { color: colors.textSecondary }]}>{zone.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: 280,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  zones: {
    gap: 10,
  },
  zoneBtn: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  zoneLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  zoneSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  zoneDesc: {
    fontSize: 11,
  },
  cancelBtn: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
