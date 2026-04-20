import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement } from '../hooks/useAccessibility';
import type { GridVariant, GridOverlayProps } from '../types';
export type { GridVariant };
export type { GridOverlayProps };

// ============================================================
// Accessibility
// ============================================================
// useAccessibilityButton hook from '../hooks/useAccessibility' generates
// screen-reader props for interactive elements. Example usage:
//
//   import { useAccessibilityButton } from '../hooks/useAccessibility';
//
//   const a11yProps = useAccessibilityButton({
//     label: '三分法构图网格',
//     hint: '双击切换到三分法网格',
//     role: 'button',
//   });
//   <TouchableOpacity {...a11yProps} onPress={handlePress}>
//     {children}
//   </TouchableOpacity>
//
// The GridOverlay itself uses useAccessibilityAnnouncement to announce
// grid type changes via accessibilityLiveRegion="polite".

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法构图网格',
  golden: '黄金比例网格',
  diagonal: '对角线网格',
  spiral: '斐波那契螺旋网格',
  none: '无网格',
};

const GRID_DESCRIPTIONS: Record<GridVariant, string> = {
  thirds: '将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图',
  golden: '基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐',
  diagonal: '提供对角线构图引导，适合建筑、风光和动态场景',
  spiral: '斐波那契螺旋引导，帮助创建自然流畅的视觉路径',
  none: '',
};

// ============================================================
// Sub-components (each is an accessibility self-contained unit)
// ============================================================

interface GridSubProps {
  gridAccent: string;
  /** Called when user taps the grid (for interactive mode) */
  onActivate?: () => void;
  /** Full accessibility label for this grid */
  accessibilityLabel: string;
  /** Sub-label shown below the main accessibility description */
  subLabel?: string;
}

/**
 * Golden spiral grid — approximates phi-based composition lines.
 * Wrapped in TouchableOpacity only when onActivate is provided,
 * otherwise renders as a passive accessible View.
 */
function GoldenSpiral({ gridAccent, onActivate, accessibilityLabel, subLabel }: GridSubProps) {
  const content = (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio vertical lines: 1/phi and phi-1/phi */}
      <View style={[styles.vLine, { left: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '61.8%', backgroundColor: gridAccent }]} />
      {/* Golden ratio horizontal lines */}
      <View style={[styles.hLine, { top: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '61.8%', backgroundColor: gridAccent }]} />
      {/* Spiral guide points */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '38.2%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      {subLabel && (
        <View style={styles.a11ySubLabel} accessibilityLabel={subLabel}>
          <View style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );

  if (onActivate) {
    return (
      <TouchableOpacity
        style={styles.overlay}
        onPress={onActivate}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View pointerEvents="box-none">{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.overlay}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      pointerEvents="none"
    >
      {content}
    </View>
  );
}

/**
 * Diagonal grid — main + secondary diagonals for dynamic composition.
 */
function DiagonalGrid({ gridAccent, onActivate, accessibilityLabel, subLabel }: GridSubProps) {
  const content = (
    <View style={styles.overlay} pointerEvents="none">
      {/* Main diagonals */}
      <View style={[styles.diagonal, styles.diagonalTLBR, { backgroundColor: gridAccent }]} />
      <View style={[styles.diagonal, styles.diagonalTRBL, { backgroundColor: gridAccent }]} />
      {/* Secondary diagonals from corners to opposite sides */}
      <View style={[styles.diagonalMinor, styles.diagonalTLMidRight, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalTRMidLeft, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalBLMidRight, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      <View style={[styles.diagonalMinor, styles.diagonalBRMidLeft, { backgroundColor: gridAccent, opacity: 0.48 }]} />
      {subLabel && (
        <View style={styles.a11ySubLabel} accessibilityLabel={subLabel}>
          <View style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );

  if (onActivate) {
    return (
      <TouchableOpacity
        style={styles.overlay}
        onPress={onActivate}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View pointerEvents="box-none">{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.overlay}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      pointerEvents="none"
    >
      {content}
    </View>
  );
}

/**
 * Fibonacci spiral grid — golden ratio grid with arc guides.
 */
function SpiralGrid({ gridAccent, onActivate, accessibilityLabel, subLabel }: GridSubProps) {
  const content = (
    <View style={styles.overlay} pointerEvents="none">
      {/* Golden ratio grid as base */}
      <View style={[styles.vLine, { left: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '61.8%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '38.2%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '61.8%', backgroundColor: gridAccent }]} />
      {/* Arc guides — quarter-circle approximations */}
      <View style={[styles.arc, { width: '23.6%', height: '23.6%', top: 0, left: 0, borderColor: gridAccent }]} />
      <View style={[styles.arc, { width: '38.2%', height: '38.2%', bottom: 0, right: 0, borderColor: gridAccent }]} />
      {/* Spiral intersection dots */}
      <View style={[styles.guidePoint, { top: '38.2%', left: '38.2%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      <View style={[styles.guidePoint, { top: '61.8%', left: '61.8%', backgroundColor: gridAccent, opacity: 0.5 }]} />
      {subLabel && (
        <View style={styles.a11ySubLabel} accessibilityLabel={subLabel}>
          <View style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );

  if (onActivate) {
    return (
      <TouchableOpacity
        style={styles.overlay}
        onPress={onActivate}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View pointerEvents="box-none">{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.overlay}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      pointerEvents="none"
    >
      {content}
    </View>
  );
}

/**
 * Rule-of-thirds grid — most common composition guide.
 */
function ThirdsGrid({ gridAccent, onActivate, accessibilityLabel, subLabel }: GridSubProps) {
  const content = (
    <View style={styles.overlay} pointerEvents="none">
      <View style={[styles.hLine, { top: '33.33%', backgroundColor: gridAccent }]} />
      <View style={[styles.hLine, { top: '66.66%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '33.33%', backgroundColor: gridAccent }]} />
      <View style={[styles.vLine, { left: '66.66%', backgroundColor: gridAccent }]} />
      {subLabel && (
        <View style={styles.a11ySubLabel} accessibilityLabel={subLabel}>
          <View style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );

  if (onActivate) {
    return (
      <TouchableOpacity
        style={styles.overlay}
        onPress={onActivate}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View pointerEvents="box-none">{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.overlay}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      pointerEvents="none"
    >
      {content}
    </View>
  );
}

// ============================================================
// ============================================================
// Grid component registry — maps variant to the sub-component
// ============================================================
const GRID_COMPONENTS: Record<Exclude<GridVariant, 'none'>, React.ComponentType<GridSubProps>> = {
  thirds: ThirdsGrid,
  golden: GoldenSpiral,
  diagonal: DiagonalGrid,
  spiral: SpiralGrid,
};

// ============================================================
// Main GridOverlay component
// ============================================================

export function GridOverlay({
  variant = 'thirds',
  onGridActivate,
}: GridOverlayProps & { onGridActivate?: (v: GridVariant) => void }) {
  const { colors } = useTheme();
  const { announce } = useAccessibilityAnnouncement();

  if (variant === 'none') return null;

  const gridAccent = colors.gridAccent;
  const label = GRID_LABELS[variant] ?? '';
  const description = GRID_DESCRIPTIONS[variant] ?? '';
  const fullA11yLabel = description ? `${label}：${description}` : label;

  // Announce grid type whenever variant changes (live region)
  // Only fires on actual prop changes, not on mount
  useEffect(() => {
    if (description) {
      announce(description, 'polite');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const handleActivate = () => {
    onGridActivate?.(variant);
  };

  const GridComponent = GRID_COMPONENTS[variant as Exclude<GridVariant, 'none'>];
  if (!GridComponent) return null;

  return (
    <View
      accessible
      accessibilityLabel={fullA11yLabel}
      accessibilityRole="image"
      accessibilityLiveRegion="polite"
      style={styles.overlay}
      pointerEvents="box-none"
    >
      <GridComponent
        gridAccent={gridAccent}
        onActivate={onGridActivate ? handleActivate : undefined}
        accessibilityLabel={fullA11yLabel}
      />
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
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
  guidePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
  },
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
  arc: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  // Hidden accessible sub-label element for screen readers
  a11ySubLabel: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});