import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSunPosition } from '../hooks/useSunPosition';
import { useAccessibilityButton } from '../hooks/useAccessibility';

// Structural-only styles (no theme colors)
const staticStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 10,
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
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

function CompassArrow({ azimuth }: { azimuth: number }) {
  const { colors } = useTheme();

  const compassTextStyle = useMemo(() => ({ color: colors.sunCompassText, fontSize: 8, fontWeight: '700' as const }), [colors.sunCompassText]);
  const compassCenterStyle = useMemo(() => ({ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sunCompassCenter, position: 'absolute' as const }), [colors.sunCompassCenter]);
  const compassRingStyle = useMemo(() => ({
    width: 52, height: 52, borderRadius: 26, borderWidth: 1,
    borderColor: colors.topBarBorderInactive,
    backgroundColor: colors.sunCompassBg,
    alignItems: 'center' as const, justifyContent: 'center' as const, position: 'relative' as const,
  }), [colors.topBarBorderInactive, colors.sunCompassBg]);

  return (
    <View style={staticStyles.compassContainer}>
      <View style={compassRingStyle}>
        <Text style={[compassTextStyle, { position: 'absolute', top: 2 }]}>N</Text>
        <Text style={[compassTextStyle, { position: 'absolute', right: 4 }]}>E</Text>
        <Text style={[compassTextStyle, { position: 'absolute', bottom: 2 }]}>S</Text>
        <Text style={[compassTextStyle, { position: 'absolute', left: 4 }]}>W</Text>
        <View style={[staticStyles.compassContainer, { transform: [{ rotate: `${azimuth}deg` }] }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.sunColor }}>↑</Text>
        </View>
        <View style={compassCenterStyle} />
      </View>
    </View>
  );
}

export function SunPositionOverlay({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const { sunData } = useSunPosition();

  const panelStyle = useMemo(() => ({
    backgroundColor: colors.sunPanelBg,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.sunPanelBorder,
    minWidth: 200,
  }), [colors.sunPanelBg, colors.sunPanelBorder]);

  const goldenRowStyle = useMemo(() => ({
    ...staticStyles.goldenRow,
    borderTopColor: colors.topBarBorderInactive,
  }), [colors.topBarBorderInactive]);

  if (!visible) return null;

  if (!sunData.available) {
    return (
      <View style={staticStyles.container} pointerEvents="none">
        <View style={panelStyle}>
          <Ionicons name="sunny-outline" size={14} color={colors.textSecondary} />
          <Text style={[staticStyles.unavailableText, { color: colors.textSecondary }]}>{sunData.advice}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={staticStyles.container} pointerEvents="none">
      <View style={panelStyle}>
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
          <View style={goldenRowStyle}>
            <Ionicons name="time-outline" size={11} color={colors.sunColor} />
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

  const toggleStyle = useMemo(() => [
    staticStyles.toggleBtn,
    visible
      ? { backgroundColor: colors.sunToggleActiveBg, borderColor: colors.sunToggleActiveBorder }
      : { backgroundColor: colors.topBarBg, borderColor: colors.topBarBorderInactive },
  ], [visible, colors.sunToggleActiveBg, colors.sunToggleActiveBorder, colors.topBarBg, colors.topBarBorderInactive]);

  const iconColor = visible ? colors.sunColor : colors.topBarTextSecondary;
  const textColor = visible ? colors.sunColor : colors.topBarTextSecondary;

  return (
    <TouchableOpacity
      style={toggleStyle}
      onPress={onPress}
      activeOpacity={0.7}
      {...useAccessibilityButton({
        label: '太阳位置',
        hint: visible ? '关闭太阳位置显示' : '打开太阳位置显示',
        role: 'button',
      })}
      accessibilityState={{ selected: visible }}
    >
      <Ionicons
        name={visible ? 'sunny' : 'sunny-outline'}
        size={14}
        color={iconColor}
      />
      <Text style={[staticStyles.toggleText, { color: textColor }]}>太阳</Text>
    </TouchableOpacity>
  );
}
