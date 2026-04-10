import React from 'react';
import { View, StyleSheet } from 'react-native';

export type GridVariant = 'thirds' | 'golden' | 'diagonal' | 'spiral' | 'none';

interface GridOverlayProps {
  variant?: GridVariant;
}

function GoldenSpiral() {
  // Approximate golden spiral using arcs in rectangles
  // Phi = 1.618...
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio vertical lines: 1/phi and phi-1/phi */}
      <View style={[styles.vLine, { left: '38.2%' }]} />
      <View style={[styles.vLine, { left: '61.8%' }]} />
      {/* Golden ratio horizontal lines */}
      <View style={[styles.hLine, { top: '38.2%' }]} />
      <View style={[styles.hLine, { top: '61.8%' }]} />
      {/* Spiral guide points - approximate golden spiral intersections */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%' }]} />
      <View style={[styles.guidePoint, { top: '38.2%', left: '61.8%' }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%' }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '38.2%' }]} />
    </View>
  );
}

function DiagonalGrid() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Main diagonals */}
      <View style={[styles.diagonal, styles.diagonalTLBR]} />
      <View style={[styles.diagonal, styles.diagonalTRBL]} />
      {/* Secondary diagonals from corners to opposite sides */}
      <View style={[styles.diagonalMinor, styles.diagonalTLMidRight]} />
      <View style={[styles.diagonalMinor, styles.diagonalTRMidLeft]} />
      <View style={[styles.diagonalMinor, styles.diagonalBLMidRight]} />
      <View style={[styles.diagonalMinor, styles.diagonalBRMidLeft]} />
    </View>
  );
}

function SpiralGrid() {
  // Fibonacci spiral approximation using arcs
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio grid as base */}
      <View style={[styles.vLine, { left: '38.2%' }]} />
      <View style={[styles.vLine, { left: '61.8%' }]} />
      <View style={[styles.hLine, { top: '38.2%' }]} />
      <View style={[styles.hLine, { top: '61.8%' }]} />
      {/* Arc guides - rendered as quarter-circle lines */}
      <View style={[styles.arc, { width: '23.6%', height: '23.6%', top: 0, left: 0 }]} />
      <View style={[styles.arc, { width: '38.2%', height: '38.2%', bottom: 0, right: 0 }]} />
      {/* Spiral intersection dots */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%' }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%' }]} />
    </View>
  );
}

export function GridOverlay({ variant = 'thirds' }: GridOverlayProps) {
  if (variant === 'none') return null;

  if (variant === 'thirds') {
    return (
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.hLineThirds1} />
        <View style={styles.hLineThirds2} />
        <View style={styles.vLineThirds1} />
        <View style={styles.vLineThirds2} />
      </View>
    );
  }

  if (variant === 'golden') {
    return <GoldenSpiral />;
  }

  if (variant === 'diagonal') {
    return <DiagonalGrid />;
  }

  if (variant === 'spiral') {
    return <SpiralGrid />;
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  // Thirds grid
  hLineThirds1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  hLineThirds2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  vLineThirds1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  vLineThirds2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Golden / general lines
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(232,213,183,0.35)',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(232,213,183,0.35)',
  },
  // Guide dots
  guidePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(232,213,183,0.5)',
    marginLeft: -4,
    marginTop: -4,
  },
  // Diagonal lines
  diagonal: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    borderColor: 'rgba(232,213,183,0.3)',
  },
});
