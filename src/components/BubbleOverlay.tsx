import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../constants/colors';

export type BubblePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface BubbleItem {
  id: number;
  text: string; // format: "[区域] 内容"
  position: BubblePosition;
}

interface BubbleOverlayProps {
  items: BubbleItem[];
  loading: boolean;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
  onBubbleAppear?: (text: string) => void;
}

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

function SingleBubble({ item, onDismiss }: { item: BubbleItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const posStyle = POSITION_STYLES[item.position];

  return (
    <Animated.View style={[styles.bubble, posStyle, { opacity }]}>
      <Text style={styles.bubbleText}>{item.text}</Text>
      <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function BubbleOverlay({ items, loading, onDismiss, onDismissAll, onBubbleAppear }: BubbleOverlayProps) {
  const [visibleItems, setVisibleItems] = useState<BubbleItem[]>([]);
  const [nextId, setNextId] = useState(0);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // When new items come in, show them one by one
  useEffect(() => {
    if (items.length === 0) return;

    const newItems = items.slice(visibleItems.length);
    if (newItems.length === 0) return;

    let delay = 0;
    for (const item of newItems) {
      delay += 250;
      setTimeout(() => {
        setVisibleItems(prev => {
          if (prev.find(i => i.id === item.id)) return prev;
          return [...prev, item];
        });
        onBubbleAppear?.(item.text);
        setNextId(item.id + 1);
      }, delay);
    }
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
    <View style={styles.container} pointerEvents="box-none">
      {loading && (
        <View style={styles.loadingTag}>
          <Text style={styles.loadingText}>分析中...</Text>
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
        <TouchableOpacity style={styles.dismissAllBtn} onPress={onDismissAll}>
          <Text style={styles.dismissAllText}>清除全部</Text>
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

const styles = StyleSheet.create({
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
  loadingText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: Colors.accent,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 12,
    paddingRight: 28,
    maxWidth: 200,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  closeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  dismissAllBtn: {
    position: 'absolute',
    bottom: 190,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  dismissAllText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});
