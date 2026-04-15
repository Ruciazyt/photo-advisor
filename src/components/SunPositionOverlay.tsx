import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSunPosition } from '../hooks/useSunPosition';
import { useAccessibilityButton } from '../hooks/useAccessibility';

// Module-level static styles
const staticStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 10,
  },
  panel: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassN: { position: 'absolute', top: 2, color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700' },
  compassE: { position: 'absolute', right: 4, color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700' },
  compassS: { position: 'absolute', bottom: 2, color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700' },
  compassW: { position: 'absolute', left: 4, color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700' },
  compassCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
  },
  infoBlock: {
    flex: 1,
    gap: 2,
  },
  altitudeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  azimuthText: {
    fontSize: 10,
  },
  adviceText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  goldenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  goldenText: {
    fontSize: 10,
    fontWeight: '600',
  },
  unavailableText: {
    fontSize: 11,
    marginLeft: 4,
  },
  toggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,184,0,0.15)',
    borderColor: 'rgba(255,184,0,0.5)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
});

function CompassArrow({ azimuth }: { azimuth: number }) {
  const { colors } = useTheme();
  return (
    <View style={staticStyles.compassContainer}>
      <View style={staticStyles.compassRing}>
        <Text style={staticStyles.compassN}>N</Text>
        <Text style={staticStyles.compassE}>E</Text>
        <Text style={staticStyles.compassS}>S</Text>
        <Text style={staticStyles.compassW}>W</Text>
        <View style={[staticStyles.compassContainer, { transform: [{ rotate: `${azimuth}deg` }] }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.sunColor }}>↑</Text>
        </View>
        <View style={staticStyles.compassCenter} />
      </View>
    </View>
  );
}

export function SunPositionOverlay({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const { sunData } = useSunPosition();

  if (!visible) return null;

  if (!sunData.available) {
    return (
      <View style={staticStyles.container} pointerEvents="none">
        <View style={staticStyles.panel}>
          <Ionicons name="sunny-outline" size={14} color={colors.textSecondary} />
          <Text style={[staticStyles.unavailableText, { color: colors.textSecondary }]}>{sunData.advice}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={staticStyles.container} pointerEvents="none">
      <View style={staticStyles.panel}>
        <View style={staticStyles.header}>
          <Ionicons name="sunny" size={16} color={colors.sunColor} />
          <Text style={[staticStyles.label, { color: colors.sunColor }]}>太阳</Text>
        </View>

        <View style={staticStyles.row}>
          <CompassArrow azimuth={sunData.sunAzimuth} />
          <View style={staticStyles.infoBlock}>
            <Text style={[staticStyles.altitudeText, { color: colors.text }]}>
              仰角 {sunData.sunAltitude.toFixed(1)}°
            </Text>
            <Text style={[staticStyles.azimuthText, { color: colors.textSecondary }]}>
              方向 {sunData.direction} ({sunData.sunAzimuth.toFixed(0)}°)
            </Text>
            <Text style={[staticStyles.adviceText, { color: colors.accent }]} numberOfLines={2}>
              {sunData.advice}
            </Text>
          </View>
        </View>

        {sunData.goldenHourStart && sunData.goldenHourEnd && (
          <View style={staticStyles.goldenRow}>
            <Ionicons name="time-outline" size={11} color="#FFB800" />
            <Text style={[staticStyles.goldenText, { color: colors.sunColor }]}>
              黄金时刻 {sunData.goldenHourStart}-{sunData.goldenHourEnd}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function SunToggleButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const a11y = useAccessibilityButton({
    label: '太阳位置',
    hint: visible ? '关闭太阳位置显示' : '打开太阳位置显示',
    role: 'button',
  });

  return (
    <TouchableOpacity
      style={[staticStyles.toggleBtn, visible && staticStyles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
      {...a11y}
      accessibilityState={{ selected: visible }}
    >
      <Ionicons
        name={visible ? 'sunny' : 'sunny-outline'}
        size={14}
        color={visible ? colors.sunColor : 'rgba(255,255,255,0.6)'}
      />
      <Text style={[staticStyles.toggleText, visible && { color: colors.sunColor }]}>太阳</Text>
    </TouchableOpacity>
  );
}
