import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface HistogramOverlayProps {
  histogramData?: number[];
  visible: boolean;
}

const BAR_COUNT = 16;
const BAR_WIDTH = 6;
const BAR_GAP = 2;
const HIST_HEIGHT = 60;
const WARN_DARK_RATIO = 0.55; // fraction of dark bins to trigger 欠曝 warning
const WARN_BRIGHT_RATIO = 0.55; // fraction of bright bins to trigger 过曝 warning

// Module-level static styles
const staticStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  warningRow: {
    flexDirection: 'row',
    gap: 6,
  },
  warnUnder: {
    fontSize: 9,
    fontWeight: '700',
  },
  warnOver: {
    fontSize: 9,
    fontWeight: '700',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HIST_HEIGHT,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 1,
    minHeight: 2,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  scaleText: {
    fontSize: 8,
  },
});

export function HistogramOverlay({ histogramData, visible }: HistogramOverlayProps) {
  const { colors } = useTheme();

  // Theme-dependent styles — useMemo to avoid re-creation
  const labelStyle = useMemo(() => [staticStyles.label, { color: colors.textSecondary }], [colors.textSecondary]);
  const warnStyle = useMemo(() => [staticStyles.warnUnder, { color: colors.error }], [colors.error]);
  const warnOverStyle = useMemo(() => [staticStyles.warnOver, { color: colors.error }], [colors.error]);
  const scaleTextStyle = useMemo(() => [staticStyles.scaleText, { color: colors.textSecondary }], [colors.textSecondary]);

  const bars = useMemo(() => {
    if (!histogramData || histogramData.length !== 256) {
      return new Array(BAR_COUNT).fill(0.05);
    }
    const result: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < 16; j++) {
        sum += histogramData[i * 16 + j];
      }
      result.push(sum / 16);
    }
    const max = Math.max(...result, 0.001);
    return result.map(v => v / max);
  }, [histogramData]);

  const warnings = useMemo(() => {
    if (!histogramData || histogramData.length !== 256) return { under: false, over: false };
    let dark = 0;
    for (let i = 0; i < 32; i++) dark += histogramData[i];
    let bright = 0;
    for (let i = 208; i < 256; i++) bright += histogramData[i];
    const total = histogramData.reduce((a, b) => a + b, 0) || 1;
    return {
      under: dark / total > WARN_DARK_RATIO,
      over: bright / total > WARN_BRIGHT_RATIO,
    };
  }, [histogramData]);

  if (!visible) return null;

  return (
    <View style={staticStyles.container} pointerEvents="none">
      <View style={staticStyles.headerRow}>
        <Text style={labelStyle}>直方图</Text>
        <View style={staticStyles.warningRow}>
          {warnings.under && <Text style={warnStyle}>欠曝</Text>}
          {warnings.over && <Text style={warnOverStyle}>过曝</Text>}
        </View>
      </View>

      <View style={staticStyles.barContainer}>
        {bars.map((height, i) => (
          <View
            key={i}
            style={[
              staticStyles.bar,
              {
                height: Math.max(2, height * HIST_HEIGHT),
                backgroundColor:
                  i < 3 ? colors.error : i > 12 ? colors.error : colors.accent,
                opacity: 0.45 + height * 0.55,
              },
            ]}
          />
        ))}
      </View>

      <View style={staticStyles.scaleRow}>
        <Text style={scaleTextStyle}>暗</Text>
        <Text style={scaleTextStyle}>亮</Text>
      </View>
    </View>
  );
}


