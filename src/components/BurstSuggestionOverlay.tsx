import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement, useAccessibilityReducedMotion } from '../hooks/useAccessibility';

interface BurstSuggestionOverlayProps {
  visible: boolean;
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function detectBurstMoment(suggestions: string[]): boolean {
  if (suggestions.length === 0) return false;
  const joined = suggestions.join('');
  const triggerCount = BURST_TRIGGER_KEYWORDS.filter(kw => joined.includes(kw)).length;
  return triggerCount >= 2;
}

export function BurstSuggestionOverlay({
  visible,
  suggestion,
  onAccept,
  onDismiss,
}: BurstSuggestionOverlayProps) {
  const { colors } = useTheme();
  const { announce } = useAccessibilityAnnouncement();
  const { reducedMotion } = useAccessibilityReducedMotion();
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);
  const announcedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      if (!announcedRef.current) {
        announce('建议连拍: ' + suggestion, 'polite');
        announcedRef.current = true;
      }
      scaleAnim.value = withSpring(1, reducedMotion ? { damping: 100, stiffness: 1000 } : { damping: 10, stiffness: 100 });
      opacityAnim.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
    } else {
      scaleAnim.value = 0;
      opacityAnim.value = 0;
    }
  }, [visible, suggestion, announce, scaleAnim, opacityAnim]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacityAnim.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.burstSuggestionBg,
            borderColor: colors.burstSuggestionBorder,
          },
          panelStyle,
        ]}
      >
        <View style={styles.header}>
          <Ionicons name="flash" size={18} color={colors.challengeActiveText} />
          <Text style={[styles.title, { color: colors.challengeActiveText }]}>建议连拍</Text>
        </View>

        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {suggestion || '检测到精彩画面，建议开启连拍捕捉更多瞬间！'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.dismissBtn, { backgroundColor: colors.modeSelectorBg }]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>忽略</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: colors.challengeActiveText }]}
            onPress={onAccept}
            activeOpacity={0.75}
          >
            <Ionicons name="camera" size={14} color={colors.burstIndicatorText} />
            <Text style={[styles.acceptText, { color: colors.burstIndicatorText }]}>开始连拍</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Module-level static styles (no theme colors at module level)
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  panel: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    width: '100%',
    maxWidth: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '600',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

// Positive AI keywords that suggest a great composition moment
const BURST_TRIGGER_KEYWORDS = [
  '完美', '精彩', '理想', '绝佳', '优秀',
  '推荐', '很好', '不错', '佳', '棒',
  '抓拍', '瞬间', '表情', '姿态', '时机',
  '黄金', '光线', '构图', '对齐', '平衡',
];