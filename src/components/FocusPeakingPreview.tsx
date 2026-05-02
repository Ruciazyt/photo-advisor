/**
 * FocusPeakingPreview — live visual preview of focus peaking settings
 *
 * Shows a colored strip representing the current peaking color, overlaid with
 * dots whose density reflects the selected sensitivity level.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  color: string;
  sensitivity: 'low' | 'medium' | 'high';
}

const SENSITIVITY_DOTS: Record<string, number> = {
  low: 6,
  medium: 12,
  high: 20,
};

const SENSITIVITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

function FocusPeakingPreviewInner({ color, sensitivity }: Props) {
  const dotCount = SENSITIVITY_DOTS[sensitivity] ?? 12;
  const sensitivityLabel = SENSITIVITY_LABELS[sensitivity] ?? '中';

  // Distribute dots evenly across the strip
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const spacing = 100 / (dotCount + 1);
    const left = spacing * (i + 1);
    return (
      <View
        key={i}
        style={[
          styles.dot,
          {
            left: `${left}%`,
            backgroundColor: '#FFFFFF',
            borderColor: color,
          },
        ]}
      />
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>预览</Text>
        <Text style={[styles.label, { color }]}>{color}</Text>
        <Text style={styles.label}>· 灵敏度 {sensitivityLabel}</Text>
      </View>
      <View style={[styles.strip, { backgroundColor: color }]}>
        {dots}
      </View>
    </View>
  );
}

export const FocusPeakingPreview = memo(FocusPeakingPreviewInner);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#888888',
  },
  strip: {
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    top: '50%',
    marginTop: -3,
  },
});