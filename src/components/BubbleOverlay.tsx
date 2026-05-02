import React, { useEffect, useMemo } from 'react';

// Shared parsing utilities — single source of truth
import {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  parseBubbleItems,
} from '../utils/parsing';

// Re-export for callers that import from BubbleOverlay
export { parseBubbleItemFromText, parseBubbleItemsFromTexts, parseBubbleItems };
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { BubbleItem } from '../types';
export type { BubblePosition } from '../types';
export { BubbleItem };

const POSITION_STYLES: Record<BubbleItem['position'], object> = {
  'top-left':     { top: 80,  left: 12,        alignSelf: 'flex-start' },
  'top-right':    { top: 80,  right: 12,       alignSelf: 'flex-end'   },
  'bottom-left':  { bottom: 200, left: 12,    alignSelf: 'flex-start' },
  'bottom-right': { bottom: 200, right: 12,   alignSelf: 'flex-end'   },
  'center':       { top: '40%', left: 0, right: 0, alignSelf: 'center' },
};

// Module-level container styles (no theme dependency)
const containerStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  loadingTag: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 21,
  },
  dismissAllBtn: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dismissAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

function SingleBubble({ item, onDismiss, onBubbleAppear }: { item: BubbleItem; onDismiss: () => void; onBubbleAppear?: (text: string) => void }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  const bubbleStyles = useMemo(() => StyleSheet.create({
    bubble: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 12,
      padding: 12,
      paddingRight: 28,
      maxWidth: 260,
    },
    bubbleText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    closeBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeText: {
      color: colors.text,
      fontSize: 12,
    },
  }), [colors.text]);

  const closeTextStyle = useMemo(() => [
    bubbleStyles.closeText,
    { color: colors.accent },
  ], [colors.accent, bubbleStyles.closeText]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Fade in once on mount — NOT on every render
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    if (onBubbleAppear) {
      onBubbleAppear(item.text);
    }
  }, []);

  const posStyle = POSITION_STYLES[item.position];

  const dismissA11yProps = useAccessibilityButton({
    label: `关闭提示: ${item.text}`,
    hint: '双击关闭此提示',
  });

  return (
    <Animated.View style={[bubbleStyles.bubble, posStyle, animatedStyle]}>
      <Text style={bubbleStyles.bubbleText}>{item.text}</Text>
      <TouchableOpacity
        style={bubbleStyles.closeBtn}
        onPress={onDismiss}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        {...dismissA11yProps}
      >
        <Text style={closeTextStyle}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export interface BubbleOverlayProps {
  /** Items currently visible (managed externally via useBubbleChat stagger logic) */
  visibleItems: BubbleItem[];
  loading: boolean;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
  onBubbleAppear?: (text: string) => void;
  /** When true, BubbleOverlay renders nothing regardless of visibleItems */
  hidden?: boolean;
}

export function BubbleOverlay({ visibleItems, loading, onDismiss, onDismissAll, onBubbleAppear, hidden }: BubbleOverlayProps) {
  const { colors } = useTheme();

  if (hidden) return null;

  const loadingTextStyle = useMemo(() => [
    { color: colors.accent },
  ], [colors.accent]);

  const dismissAllTextStyle = useMemo(() => [
    containerStyles.dismissAllText,
    { color: colors.accent },
  ], [colors.accent]);

  if (!loading && visibleItems.length === 0) {
    return null;
  }

  return (
    <View style={containerStyles.container} pointerEvents="box-none">
      {loading && (
        <View style={containerStyles.loadingTag}>
          <Text style={[{ backgroundColor: 'rgba(0,0,0,0.6)', fontSize: 13, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' }, loadingTextStyle]}>分析中...</Text>
        </View>
      )}
      {visibleItems.map(item => (
        <SingleBubble
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
          onBubbleAppear={onBubbleAppear}
        />
      ))}
      {visibleItems.length > 1 && !loading && (
        <TouchableOpacity
          style={containerStyles.dismissAllBtn}
          onPress={onDismissAll}
          {...useAccessibilityButton({ label: '清除全部提示', hint: '双击关闭所有提示' })}
        >
          <Text style={dismissAllTextStyle}>清除全部</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


