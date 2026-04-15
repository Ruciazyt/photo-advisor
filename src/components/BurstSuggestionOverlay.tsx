import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement } from '../hooks/useAccessibility';

// Module-level static styles
const burstStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  panel: {
    backgroundColor: 'rgba(20,16,8,0.92)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
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
    color: '#FFD700',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: '#FFD700',
  },
  acceptText: {
    color: '#000',
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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const announcedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      if (!announcedRef.current) {
        announce('建议连拍: ' + suggestion, 'polite');
        announcedRef.current = true;
      }
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[burstStyles.container, { opacity: opacityAnim }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          burstStyles.panel,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={burstStyles.header}>
          <Ionicons name="flash-on" size={18} color="#FFD700" />
          <Text style={burstStyles.title}>建议连拍</Text>
        </View>

        <Text style={[burstStyles.message, { color: colors.text }]} numberOfLines={2}>
          {suggestion || '检测到精彩画面，建议开启连拍捕捉更多瞬间！'}
        </Text>

        <View style={burstStyles.actions}>
          <TouchableOpacity
            style={burstStyles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[burstStyles.dismissText, { color: colors.textSecondary }]}>忽略</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={burstStyles.acceptBtn}
            onPress={onAccept}
            activeOpacity={0.75}
          >
            <Ionicons name="camera" size={14} color="#fff" />
            <Text style={burstStyles.acceptText}>开始连拍</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
