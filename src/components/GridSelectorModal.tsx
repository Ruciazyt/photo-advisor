import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { GridVariant, GridSelectorModalProps } from '../types';
export type { GridSelectorModalProps };

const GRID_VARIANTS: { key: GridVariant; label: string }[] = [
  { key: 'thirds', label: '三分法' },
  { key: 'golden', label: '黄金分割' },
  { key: 'diagonal', label: '对角线' },
  { key: 'spiral', label: '螺旋线' },
  { key: 'none', label: '关闭网格' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---- Mini preview components ----

function ThirdsPreview() {
  return (
    <View style={previewStyles.container}>
      <View style={previewStyles.hLineThirds1} />
      <View style={previewStyles.hLineThirds2} />
      <View style={previewStyles.vLineThirds1} />
      <View style={previewStyles.vLineThirds2} />
    </View>
  );
}

function GoldenPreview() {
  return (
    <View style={previewStyles.container}>
      <View style={[previewStyles.vLine, { left: '38.2%' }]} />
      <View style={[previewStyles.vLine, { left: '61.8%' }]} />
      <View style={[previewStyles.hLine, { top: '38.2%' }]} />
      <View style={[previewStyles.hLine, { top: '61.8%' }]} />
      <View style={[previewStyles.guidePoint, { top: '38.2%', left: '38.2%' }]} />
      <View style={[previewStyles.guidePoint, { top: '38.2%', left: '61.8%' }]} />
      <View style={[previewStyles.guidePoint, { top: '61.8%', left: '61.8%' }]} />
      <View style={[previewStyles.guidePoint, { top: '61.8%', left: '38.2%' }]} />
    </View>
  );
}

function DiagonalPreview() {
  return (
    <View style={previewStyles.container}>
      <View style={[previewStyles.diagonal, previewStyles.diagonalTLBR]} />
      <View style={[previewStyles.diagonal, previewStyles.diagonalTRBL]} />
    </View>
  );
}

function SpiralPreview() {
  return (
    <View style={previewStyles.container}>
      <View style={[previewStyles.vLine, { left: '38.2%' }]} />
      <View style={[previewStyles.vLine, { left: '61.8%' }]} />
      <View style={[previewStyles.hLine, { top: '38.2%' }]} />
      <View style={[previewStyles.hLine, { top: '61.8%' }]} />
      <View style={[previewStyles.guidePoint, { top: '38.2%', left: '38.2%' }]} />
      <View style={[previewStyles.guidePoint, { top: '61.8%', left: '61.8%' }]} />
    </View>
  );
}

function NonePreview() {
  return (
    <View style={[previewStyles.container, previewStyles.noneContainer]}>
      <Text style={previewStyles.noneText}>无网格</Text>
    </View>
  );
}

function GridPreview({ variant }: { variant: GridVariant }) {
  switch (variant) {
    case 'thirds': return <ThirdsPreview />;
    case 'golden': return <GoldenPreview />;
    case 'diagonal': return <DiagonalPreview />;
    case 'spiral': return <SpiralPreview />;
    case 'none': return <NonePreview />;
    default: return null;
  }
}

// ---- Grid Card ----

interface GridCardProps {
  variant: { key: GridVariant; label: string };
  isSelected: boolean;
  onSelect: (v: GridVariant) => void;
}

function GridCard({ variant, isSelected, onSelect }: GridCardProps) {
  const a11y = useAccessibilityButton({
    label: variant.label,
    hint: `选择${variant.label}网格`,
    role: 'menuitem',
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
      onPress={() => onSelect(variant.key)}
      activeOpacity={0.75}
      {...a11y}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.previewWrapper}>
        <GridPreview variant={variant.key} />
      </View>
      <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
        {variant.label}
      </Text>
    </TouchableOpacity>
  );
}

// ---- Main Modal ----

export function GridSelectorModal({
  visible,
  selectedVariant,
  onSelect,
  onClose,
}: GridSelectorModalProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor: 'rgba(20,20,20,0.95)',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingBottom: 40,
      paddingTop: 12,
      minHeight: SHEET_HEIGHT,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      position: 'relative',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
    },
    closeBtn: {
      position: 'absolute',
      right: 0,
      top: -4,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    card: {
      width: (SCREEN_WIDTH - 32 - 16 - 12) / 2,
      height: 120,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    cardSelected: {
      borderColor: colors.accent,
      backgroundColor: 'rgba(232,213,183,0.12)',
    },
    previewWrapper: {
      width: 140,
      height: 80,
      overflow: 'hidden',
      borderRadius: 6,
    },
    cardLabel: {
      color: '#AAAAAA',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    cardLabelSelected: {
      color: colors.accent,
    },
    closeCard: {
      width: '100%',
      height: 48,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeCardSelected: {
      borderColor: colors.accent,
      backgroundColor: 'rgba(232,213,183,0.12)',
    },
    closeCardLabel: {
      color: '#AAAAAA',
      fontSize: 14,
      fontWeight: '600',
    },
  });  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      setIsShown(true);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsShown(false);
      });
    }
  }, [visible, translateY, opacity]);

  if (!isShown) return null;

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>选择网格</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            {...useAccessibilityButton({
              label: '关闭',
              hint: '关闭网格选择器',
              role: 'button',
            })}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Grid cards — 2 columns, last row full width for "关闭网格" */}
        <View style={styles.grid}>
          {GRID_VARIANTS.slice(0, 4).map((v) => (
            <GridCard
              key={v.key}
              variant={v}
              isSelected={selectedVariant === v.key}
              onSelect={onSelect}
            />
          ))}
        </View>

        {/* Full-width close card */}
        <TouchableOpacity
          style={[
            styles.closeCard,
            selectedVariant === 'none' && styles.closeCardSelected,
          ]}
          onPress={() => onSelect('none')}
          activeOpacity={0.75}
          {...useAccessibilityButton({
            label: '关闭网格',
            hint: '关闭网格选择',
            role: 'menuitem',
          })}
          accessibilityState={{ selected: selectedVariant === 'none' }}
        >
          <Text
            style={[
              styles.closeCardLabel,
              selectedVariant === 'none' && styles.cardLabelSelected,
            ]}
          >
            {GRID_VARIANTS[4].label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const SHEET_HEIGHT = 380;


// ---- Shared preview styles ----
const previewStyles = StyleSheet.create({
  container: {
    width: 140,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Thirds
  hLineThirds1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  hLineThirds2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  vLineThirds1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  vLineThirds2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  // Golden
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(232,213,183,0.45)',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(232,213,183,0.45)',
  },
  guidePoint: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(232,213,183,0.6)',
    marginLeft: -2.5,
    marginTop: -2.5,
  },
  // Diagonal
  diagonal: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  diagonalTLBR: {
    width: '155%',
    height: 1,
    top: '50%',
    left: '-27%',
    transform: [{ rotate: '-45deg' }],
  },
  diagonalTRBL: {
    width: '155%',
    height: 1,
    top: '50%',
    left: '-27%',
    transform: [{ rotate: '45deg' }],
  },
  // None
  noneContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noneText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: '500',
  },
});
