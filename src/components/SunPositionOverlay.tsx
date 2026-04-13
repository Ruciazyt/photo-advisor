import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSunPosition } from '../hooks/useSunPosition';

function CompassArrow({ azimuth }: { azimuth: number }) {
  // Draw a simple compass with an arrow pointing to sun azimuth
  return (
    <View style={styles.compassContainer}>
      <View style={styles.compassRing}>
        <Text style={styles.compassN}>N</Text>
        <Text style={styles.compassE}>E</Text>
        <Text style={styles.compassS}>S</Text>
        <Text style={styles.compassW}>W</Text>
        {/* Arrow pointing to sun direction */}
        <View style={[styles.arrowWrapper, { transform: [{ rotate: `${azimuth}deg` }] }]}>
          <Text style={styles.arrow}>↑</Text>
        </View>
        {/* Center dot */}
        <View style={styles.compassCenter} />
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
      <View style={styles.container} pointerEvents="none">
        <View style={styles.panel}>
          <Ionicons name="sunny-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.unavailableText}>{sunData.advice}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.panel}>
        <View style={styles.header}>
          <Ionicons name="sunny" size={16} color={colors.sunColor} />
          <Text style={styles.label}>太阳</Text>
        </View>

        <View style={styles.row}>
          <CompassArrow azimuth={sunData.sunAzimuth} />
          <View style={styles.infoBlock}>
            <Text style={styles.altitudeText}>
              仰角 {sunData.sunAltitude.toFixed(1)}°
            </Text>
            <Text style={styles.azimuthText}>
              方向 {sunData.direction} ({sunData.sunAzimuth.toFixed(0)}°)
            </Text>
            <Text style={styles.adviceText} numberOfLines={2}>
              {sunData.advice}
            </Text>
          </View>
        </View>

        {sunData.goldenHourStart && sunData.goldenHourEnd && (
          <View style={styles.goldenRow}>
            <Ionicons name="time-outline" size={11} color="#FFB800" />
            <Text style={styles.goldenText}>
              黄金时刻 {sunData.goldenHourStart}-{sunData.goldenHourEnd}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function SunToggleButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, visible && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={visible ? 'sunny' : 'sunny-outline'}
        size={14}
        color={visible ? colors.sunColor : 'rgba(255,255,255,0.6)'}
      />
      <Text style={[styles.toggleText, visible && styles.toggleTextActive]}>太阳</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    color: colors.sunColor,
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
  arrowWrapper: {
    position: 'absolute',
  },
  arrow: {
    fontSize: 16,
    color: colors.sunColor,
    fontWeight: '700',
  },
  infoBlock: {
    flex: 1,
    gap: 2,
  },
  altitudeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  azimuthText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  adviceText: {
    color: colors.accent,
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
    color: colors.sunColor,
    fontSize: 10,
    fontWeight: '600',
  },
  unavailableText: {
    color: colors.textSecondary,
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
  toggleTextActive: {
    color: colors.sunColor,
  },
});
