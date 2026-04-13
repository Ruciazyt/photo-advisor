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

export function HistogramOverlay({ histogramData, visible }: HistogramOverlayProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
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
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    warningRow: {
      flexDirection: 'row',
      gap: 6,
    },
    warnUnder: {
      color: colors.error,
      fontSize: 9,
      fontWeight: '700',
    },
    warnOver: {
      color: colors.error,
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
      color: colors.textSecondary,
      fontSize: 8,
    },
  });

  const bars = useMemo(() => {
    if (!histogramData || histogramData.length !== 256) {
      return new Array(BAR_COUNT).fill(0.05);
    }

    // Group 256 bins into 16 bars (each bar = 16 original bins)
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
    <View style={styles.container} pointerEvents="none">
      <View style={styles.headerRow}>
        <Text style={styles.label}>直方图</Text>
        <View style={styles.warningRow}>
          {warnings.under && <Text style={styles.warnUnder}>欠曝</Text>}
          {warnings.over && <Text style={styles.warnOver}>过曝</Text>}
        </View>
      </View>

      <View style={styles.barContainer}>
        {bars.map((height, i) => (
          <View
            key={i}
            style={[
              styles.bar,
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

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>暗</Text>
        <Text style={styles.scaleText}>亮</Text>
      </View>
    </View>
  );
}


