import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import type { BubbleItem, BubbleOverlayProps } from '../types';
export type { BubblePosition } from '../types';
export { BubbleItem };
export type { BubbleOverlayProps };

function parsePosition(text: string): BubbleItem['position'] {
  if (text.includes('[左上]')) return 'top-left';
  if (text.includes('[右上]')) return 'top-right';
  if (text.includes('[左下]')) return 'bottom-left';
  if (text.includes('[右下]')) return 'bottom-right';
  if (text.includes('[中间]')) return 'center';
  return 'center';
}

const POSITION_STYLES: Record<BubbleItem['position'], object> = {
  'top-left':     { top: 80,  left: 12,        alignSelf: 'flex-start' },
  'top-right':    { top: 80,  right: 12,       alignSelf: 'flex-end'   },
  'bottom-left':  { bottom: 200, left: 12,    alignSelf: 'flex-start' },
  'bottom-right': { bottom: 200, right: 12,   alignSelf: 'flex-end'   },
  'center':       { top: '40%', left: 0, right: 0, alignSelf: 'center' },
};

// Module-level static styles
const bubbleBaseStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 12,
    paddingRight: 28,
    maxWidth: 260,
  },
  bubbleText: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 12,
  },
});

// Module-level container styles
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

function SingleBubble({ item, onDismiss }: { item: BubbleItem; onDismiss: () => void }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  const closeTextStyle = useMemo(() => [
    bubbleBaseStyles.closeText,
    { color: colors.accent },
  ], [colors.accent]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Fade in once on mount — NOT on every render
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const posStyle = POSITION_STYLES[item.position];

  return (
    <Animated.View style={[bubbleBaseStyles.bubble, posStyle, animatedStyle]}>
      <Text style={bubbleBaseStyles.bubbleText}>{item.text}</Text>
      <TouchableOpacity style={bubbleBaseStyles.closeBtn} onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={closeTextStyle}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function BubbleOverlay({ items, loading, onDismiss, onDismissAll, onBubbleAppear }: BubbleOverlayProps) {
  const { colors } = useTheme();
  const [visibleItems, setVisibleItems] = useState<BubbleItem[]>([]);
  const [nextId, setNextId] = useState(0);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const loadingTextStyle = useMemo(() => [
    { color: colors.accent },
  ], [colors.accent]);

  const dismissAllTextStyle = useMemo(() => [
    containerStyles.dismissAllText,
    { color: colors.accent },
  ], [colors.accent]);

  // When new items come in, show them one by one using withDelay on UI thread
  useEffect(() => {
    if (items.length === 0) return;

    const newItems = items.slice(visibleItems.length);
    if (newItems.length === 0) return;

    newItems.forEach((item, idx) => {
      // Schedule each bubble to appear with a staggered delay — all UI thread
      withDelay(idx * 250, () => {
        setVisibleItems(prev => {
          if (prev.find(i => i.id === item.id)) return prev;
          return [...prev, item];
        });
        onBubbleAppear?.(item.text);
        setNextId(item.id + 1);
      });
    });
  }, [items]);

  // Clear all when loading starts
  useEffect(() => {
    if (loading) {
      setVisibleItems([]);
    }
  }, [loading]);

  const handleDismiss = (id: number) => {
    setVisibleItems(prev => prev.filter(i => i.id !== id));
  };

  if (!loading && visibleItems.length === 0 && items.length === 0) {
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
          onDismiss={() => handleDismiss(item.id)}
        />
      ))}
      {visibleItems.length > 1 && !loading && (
        <TouchableOpacity style={containerStyles.dismissAllBtn} onPress={onDismissAll}>
          <Text style={dismissAllTextStyle}>清除全部</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Parse raw suggestion text into structured BubbleItem
// Supports formats: "[区域] 内容" or plain "内容"
export function parseBubbleItems(rawTexts: string[]): BubbleItem[] {
  return rawTexts
    .filter(text => text.trim().length > 0)
    .map((text, i) => {
      const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        const pos = match[1];
        const content = match[2].trim();
        const position = (
          pos.includes('左上') ? 'top-left' :
          pos.includes('右上') ? 'top-right' :
          pos.includes('左下') ? 'bottom-left' :
          pos.includes('右下') ? 'bottom-right' :
          pos.includes('中间') ? 'center' :
          'center'
        );
        return { id: i, text: `[${pos}] ${content}`, position };
      }
      // No position tag — use a round-robin default
      const defaults: BubbleItem['position'][] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      return { id: i, text, position: defaults[i % defaults.length] };
    });
}
