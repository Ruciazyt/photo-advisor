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

// Module-level singleton — avoid repeated allocation for the empty / fallback bars
const EMPTY_BARS = Array.from({ length: BAR_COUNT }, () => 0.05);
const EMPTY_HISTOGRAM = new Array(256).fill(0);

// Individual bar memo — only re-renders when its own height/color actually changes
const Bar = React.memo(
  function Bar({
    height,
    backgroundColor,
    opacity,
  }: {
    height: number;
    backgroundColor: string;
    opacity: number;
  }) {
    return (
      <View
        style={[
          staticStyles.bar,
          {
            height: Math.max(2, height * HIST_HEIGHT),
            backgroundColor,
            opacity,
          },
        ]}
      />
    );
  },
  (prev, next) =>
    prev.height === next.height &&
    prev.backgroundColor === next.backgroundColor &&
    prev.opacity === next.opacity
);

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
      return EMPTY_BARS;
    }
    const result: number[] = new Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      const base = i * 16;
      // Unrolled 16-iteration loop — faster than a nested loop with bounds checks
      sum += histogramData[base];
      sum += histogramData[base + 1];
      sum += histogramData[base + 2];
      sum += histogramData[base + 3];
      sum += histogramData[base + 4];
      sum += histogramData[base + 5];
      sum += histogramData[base + 6];
      sum += histogramData[base + 7];
      sum += histogramData[base + 8];
      sum += histogramData[base + 9];
      sum += histogramData[base + 10];
      sum += histogramData[base + 11];
      sum += histogramData[base + 12];
      sum += histogramData[base + 13];
      sum += histogramData[base + 14];
      sum += histogramData[base + 15];
      result[i] = sum / 16;
    }
    // Find max without spread operator — avoids O(n) allocation per frame
    let max = 0.001;
    for (let i = 0; i < BAR_COUNT; i++) {
      if (result[i] > max) max = result[i];
    }
    // Build normalised bars
    const barsOut: number[] = new Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      barsOut[i] = result[i] / max;
    }
    return barsOut;
  }, [histogramData]);

  const warnings = useMemo(() => {
    if (!histogramData || histogramData.length !== 256) return { under: false, over: false };
    let dark = 0;
    for (let i = 0; i < 32; i++) dark += histogramData[i];
    let bright = 0;
    for (let i = 208; i < 256; i++) bright += histogramData[i];
    // Accumulate total without a separate reduce pass over 256 elements
    let total = dark + bright;
    for (let i = 32; i < 208; i++) total += histogramData[i];
    if (total === 0) total = 1;
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
        {bars.map((height, i) => {
          const backgroundColor =
            i < 3 ? colors.error : i > 12 ? colors.error : colors.accent;
          const opacity = 0.45 + height * 0.55;
          return (
            <Bar
              key={i}
              height={height}
              backgroundColor={backgroundColor}
              opacity={opacity}
            />
          );
        })}
      </View>

      <View style={staticStyles.scaleRow}>
        <Text style={scaleTextStyle}>暗</Text>
        <Text style={scaleTextStyle}>亮</Text>
      </View>
    </View>
  );
}


