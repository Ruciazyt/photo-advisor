import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TIMER_OPTIONS, TimerDuration } from '../hooks/useCountdown';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { TimerSelectorModalProps } from '../types';
export type { TimerSelectorModalProps };

// Static styles (no theme colors)
const timerCardStaticStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    minWidth: 90,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});

function TimerCard({ opt, isSelected, onSelect }: TimerCardProps) {
  const { colors } = useTheme();
  const a11y = useAccessibilityButton({
    label: `定时${opt.value}秒`,
    hint: `设置${opt.value}秒定时拍摄`,
    role: 'menuitem',
  });

  const cardStyle = [
    timerCardStaticStyles.card,
    isSelected
      ? { borderColor: colors.accent, backgroundColor: 'rgba(232,213,183,0.12)' }
      : { borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.05)' },
  ];
  const labelStyle = [
    timerCardStaticStyles.cardLabel,
    isSelected ? { color: colors.accent } : { color: colors.textSecondary },
  ];

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={() => onSelect(opt.value)}
      activeOpacity={0.75}
      {...a11y}
      accessibilityState={{ selected: isSelected }}
    >
      <TimerPreview seconds={opt.value} />
      <Text style={labelStyle}>{opt.label}</Text>
    </TouchableOpacity>
  );
}

function TimerPreview({ seconds }: { seconds: number }) {
  const { colors } = useTheme();

  return (
    <View style={{
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.timerPreviewBg,
      borderWidth: 3,
      borderColor: colors.timerBorder,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 40, fontWeight: '800', color: colors.countdownText }}>{seconds}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.timerUnitText, marginTop: 2 }}>秒</Text>
    </View>
  );
}

// ---- Main Modal ----

const SHEET_HEIGHT = 340;

export function TimerSelectorModal({
  visible,
  selectedDuration,
  onSelect,
  onClose,
}: TimerSelectorModalProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const [isShown, setIsShown] = useState(false);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { stiffness: 100, damping: 20 });
      opacity.value = withTiming(1, { duration: 250 });
      setIsShown(true);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, (finished) => {
        if (finished) runOnJS(setIsShown)(false);
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  if (!isShown) return null;

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayBg }, backdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, minHeight: SHEET_HEIGHT }, sheetStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>定时拍摄</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ position: 'absolute', right: 0, top: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.topBarBg, justifyContent: 'center', alignItems: 'center' }}
            hitSlop={8}
            {...useAccessibilityButton({
              label: '关闭',
              hint: '关闭定时器选择器',
              role: 'button',
            })}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Timer option cards */}
        <View style={styles.grid}>
          {TIMER_OPTIONS.map((opt) => (
            <TimerCard
              key={opt.value}
              opt={opt}
              isSelected={opt.value === selectedDuration}
              onSelect={onSelect}
            />
          ))}
        </View>

        {/* Hint */}
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={13} color={colors.scoreHintText} />
          <Text style={{ color: colors.scoreHintText, fontSize: 12 }}>
            {selectedDuration > 3 ? '建议使用支架或稳定表面' : '适合手持自拍'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
});