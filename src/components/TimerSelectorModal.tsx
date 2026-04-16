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

// ---- Timer card preview ----

interface TimerCardProps {
  opt: { value: TimerDuration; label: string };
  isSelected: boolean;
  onSelect: (v: TimerDuration) => void;
}

function TimerCard({ opt, isSelected, onSelect }: TimerCardProps) {
  const { colors } = useTheme();
  const a11y = useAccessibilityButton({
    label: `定时${opt.value}秒`,
    hint: `设置${opt.value}秒定时拍摄`,
    role: 'menuitem',
  });

  const cardStyle = [
    timerCardStaticStyles.card,
    isSelected && { borderColor: colors.accent, backgroundColor: 'rgba(232,213,183,0.12)' },
  ];
  const labelStyle = [
    timerCardStaticStyles.cardLabel,
    isSelected && { color: colors.accent },
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

// TimerPreview static styles
const timerCardStaticStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 90,
  },
  cardLabel: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});

function TimerPreview({ seconds }: { seconds: number }) {
  const { colors } = useTheme();

  return (
    <View style={timerPreviewStaticStyles.container}>
      <Text style={[timerPreviewStaticStyles.number, { color: colors.countdownText }]}>{seconds}</Text>
      <Text style={timerPreviewStaticStyles.unit}>秒</Text>
    </View>
  );
}

const timerPreviewStaticStyles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: 40,
    fontWeight: '800',
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
});

// ---- Main Modal ----

const SHEET_HEIGHT = 340;

const modalStaticStyles = StyleSheet.create({
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
    backgroundColor: 'rgba(20,20,20,0.97)',
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
    marginBottom: 20,
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
  hintText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
});

export function TimerSelectorModal({
  visible,
  selectedDuration,
  onSelect,
  onClose,
}: TimerSelectorModalProps) {
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
    <View style={modalStaticStyles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[modalStaticStyles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[modalStaticStyles.sheet, sheetStyle]}>
        {/* Header */}
        <View style={modalStaticStyles.header}>
          <Text style={modalStaticStyles.title}>定时拍摄</Text>
          <TouchableOpacity
            onPress={onClose}
            style={modalStaticStyles.closeBtn}
            hitSlop={8}
            {...useAccessibilityButton({
              label: '关闭',
              hint: '关闭定时器选择器',
              role: 'button',
            })}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Timer option cards */}
        <View style={modalStaticStyles.grid}>
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
        <View style={modalStaticStyles.hintRow}>
          <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={modalStaticStyles.hintText}>
            {selectedDuration > 3 ? '建议使用支架或稳定表面' : '适合手持自拍'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
