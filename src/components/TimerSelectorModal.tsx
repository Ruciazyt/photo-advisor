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
import { TIMER_OPTIONS, TimerDuration } from '../hooks/useCountdown';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { TimerSelectorModalProps } from '../types';
export type { TimerSelectorModalProps };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---- Timer card preview ----

interface TimerCardProps {
  opt: { value: TimerDuration; label: string };
  isSelected: boolean;
  onSelect: (v: TimerDuration) => void;
}

function TimerCard({ opt, isSelected, onSelect }: TimerCardProps) {
  const a11y = useAccessibilityButton({
    label: `定时${opt.value}秒`,
    hint: `设置${opt.value}秒定时拍摄`,
    role: 'menuitem',
  });

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onSelect(opt.value)}
      activeOpacity={0.75}
      {...a11y}
      accessibilityState={{ selected: isSelected }}
    >
      <TimerPreview seconds={opt.value} />
      <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
        {opt.label}
      </Text>
    </TouchableOpacity>
  );
}

function TimerPreview({ seconds }: { seconds: number }) {
  const { colors } = useTheme();

  const localStyles = StyleSheet.create({
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
      color: colors.countdownText,
    },
    unit: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.5)',
      marginTop: 2,
    },
  });

  return (
    <View style={localStyles.container}>
      <Text style={localStyles.number}>{seconds}</Text>
      <Text style={localStyles.unit}>秒</Text>
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
    cardSelected: {
      borderColor: colors.accent,
      backgroundColor: 'rgba(232,213,183,0.12)',
    },
    cardLabel: {
      color: '#AAAAAA',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
    },
    cardLabelSelected: {
      color: colors.accent,
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

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
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

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>定时拍摄</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
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
          <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.hintText}>
            {selectedDuration > 3 ? '建议使用支架或稳定表面' : '适合手持自拍'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
