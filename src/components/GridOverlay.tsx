import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { GridVariant, GridOverlayProps } from '../types';
export type { GridVariant };
export type { GridOverlayProps };

function GoldenSpiral({ gridAccent }: { gridAccent: string }) {
  // Approximate golden spiral using arcs in rectangles
  // Phi = 1.618...
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio vertical lines: 1/phi and phi-1/phi */}
      <View style={[styles.vLine, { left: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '61.8%', backgroundColor: gridAccent }]} />
      {/* Golden ratio horizontal lines */}
      <View style={[styles.hLine, { top: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '61.8%', backgroundColor: gridAccent }]} />
      {/* Spiral guide points - approximate golden spiral intersections */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '38.2%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
    </View>
  );
}

function DiagonalGrid({ gridAccent }: { gridAccent: string }) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Main diagonals */}
      <View style={[styles.diagonal, styles.diagonalTLBR, { backgroundColor: gridAccent }]} />
      <View style={[styles.diagonal, styles.diagonalTRBL, { backgroundColor: gridAccent }]} />
      {/* Secondary diagonals from corners to opposite sides */}
      <View style={[styles.diagonalMinor, styles.diagonalTLMidRight, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalTRMidLeft, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalBLMidRight, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalBRMidLeft, { backgroundColor: gridAccent, opacity: 0.48 }]} />
    </View>
  );
}

function SpiralGrid({ gridAccent }: { gridAccent: string }) {
  // Fibonacci spiral approximation using arcs
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio grid as base */}
      <View style={[styles.vLine, { left: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '61.8%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '61.8%', backgroundColor: gridAccent }]} />
      {/* Arc guides - rendered as quarter-circle lines */}
      <View style={[styles.arc, { width: '23.6%', height: '23.6%', top: 0, left: 0, borderColor: gridAccent }]} />
      <View style={[styles.arc, { width: '38.2%', height: '38.2%', bottom: 0, right: 0, borderColor: gridAccent }]} />
      {/* Spiral intersection dots */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
    </View>
  );
}

function ThirdsGrid({ gridAccent }: { gridAccent: string }) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={[styles.hLine, { top: '33.33%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '66.66%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '33.33%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '66.66%', backgroundColor: gridAccent }]} />
    </View>
  );
}

export function GridOverlay({ variant = 'thirds' }: GridOverlayProps) {
  const { colors } = useTheme();
  if (variant === 'none') return null;

  // Use gridAccent for golden lines; fall back to semi-transparent white for thirds
  const gridAccent = colors.gridAccent;

  if (variant === 'thirds') {
    return <ThirdsGrid gridAccent={gridAccent} />;
  }

  if (variant === 'golden') {
    return <GoldenSpiral gridAccent={gridAccent} />;
  }

  if (variant === 'diagonal') {
    return <DiagonalGrid gridAccent={gridAccent} />;
  }

  if (variant === 'spiral') {
    return <SpiralGrid gridAccent={gridAccent} />;
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  // Thirds grid (overridden via inline style)
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  // Guide dots
  guidePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
  },
  // Diagonal lines
  diagonal: {
    position: 'absolute',
  },
  diagonalTLBR: {
    width: '141.4%',
    height: 1,
    top: '50%',
    left: '-20%',
    transform: [{ rotate: '-45deg' }],
  },
  diagonalTRBL: {
    width: '141.4%',
    height: 1,
    top: '50%',
    left: '-20%',
    transform: [{ rotate: '45deg' }],
  },
  diagonalMinor: {
    position: 'absolute',
  },
  diagonalTLMidRight: {
    width: '70.7%',
    height: 1,
    top: '30%',
    left: '-10%',
    transform: [{ rotate: '-45deg' }],
  },
  diagonalTRMidLeft: {
    width: '70.7%',
    height: 1,
    top: '30%',
    right: '-10%',
    transform: [{ rotate: '45deg' }],
  },
  diagonalBLMidRight: {
    width: '70.7%',
    height: 1,
    bottom: '30%',
    left: '-10%',
    transform: [{ rotate: '45deg' }],
  },
  diagonalBRMidLeft: {
    width: '70.7%',
    height: 1,
    bottom: '30%',
    right: '-10%',
    transform: [{ rotate: '-45deg' }],
  },
  // Spiral arcs (approximated with border radius on small squares)
  arc: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
});
