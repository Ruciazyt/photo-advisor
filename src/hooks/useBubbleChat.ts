/**
 * useBubbleChat — manages staggered bubble item appearance and dismissal.
 *
 * Responsibilities:
 * - Track which items are currently visible (staggered reveal)
 * - Individual and bulk dismiss
 * - Loading state clears visible items
 * - Callback for voice feedback on new bubble appear
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BubbleItem, BubblePosition } from '../types';

export interface UseBubbleChatOptions {
  /** Called when a new bubble becomes visible (for voice feedback) */
  onBubbleAppear?: (text: string) => void;
  /** Delay between staggered bubble reveals in ms (default 250) */
  staggerDelayMs?: number;
}

export interface UseBubbleChatReturn {
  visibleItems: BubbleItem[];
  loading: boolean;
  handleDismiss: (id: number) => void;
  handleDismissAll: () => void;
  /** Set the full items list (triggers staggered reveal) */
  setItems: (items: BubbleItem[]) => void;
  /** Update loading state (clears visible items when true) */
  setLoading: (loading: boolean) => void;
}

const ROUND_ROBIN: BubblePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const POSITION_MAP: Record<string, BubblePosition> = {
  '[左上]': 'top-left',
  '[右上]': 'top-right',
  '[左下]': 'bottom-left',
  '[右下]': 'bottom-right',
  '[中间]': 'center',
};

/**
 * Parse raw AI suggestion text into a BubbleItem.
 * Supports formats: "[区域] 内容" or plain "内容"
 */
export function parseBubbleItemFromText(text: string, id: number): BubbleItem {
  const roundRobin: BubblePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  // Check for explicit position tag
  let position: BubblePosition = roundRobin[id % roundRobin.length];
  for (const [tag, pos] of Object.entries(POSITION_MAP)) {
    if (text.includes(tag)) {
      position = pos;
      break;
    }
  }

  return { id, text, position };
}

/**
 * Parse an array of raw suggestion strings into BubbleItem[].
 * This is the primary entry point for converting AI suggestions to bubble items.
 */
export function parseBubbleItemsFromTexts(rawTexts: string[]): BubbleItem[] {
  return rawTexts
    .filter(text => text.trim().length > 0)
    .map((text, i) => parseBubbleItemFromText(text, i));
}

export function useBubbleChat({
  onBubbleAppear,
  staggerDelayMs = 250,
}: UseBubbleChatOptions = {}): UseBubbleChatReturn {
  const [allItems, setAllItems] = useState<BubbleItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<BubbleItem[]>([]);
  const [loading, setLoadingInternal] = useState(false);

  // Keep latest loading flag accessible in setTimeout closures
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // When allItems changes, show new items one by one with stagger
  useEffect(() => {
    if (allItems.length === 0) return;

    const newItems = allItems.slice(visibleItems.length);
    if (newItems.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    newItems.forEach((item, idx) => {
      const delay = (idx + 1) * staggerDelayMs;
      const t = setTimeout(() => {
        // Guard: if loading started, don't reveal more items
        if (loadingRef.current) return;

        setVisibleItems(prev => {
          if (prev.find(i => i.id === item.id)) return prev;
          return [...prev, item];
        });
        onBubbleAppear?.(item.text);
      }, delay);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [allItems, visibleItems.length, staggerDelayMs, onBubbleAppear]);

  /**
   * State machine for bubble chat visibility:
   * - loading=true: clears BOTH visibleItems AND allItems, suppressing all reveals
   * - loading=false: allows staggered reveals from allItems into visibleItems
   *
   * This ensures rapid suggestion changes (loading=true → new items → loading=false)
   * start fresh without stale data from previous suggestion batches.
   */
  const setLoading = useCallback((v: boolean) => {
    setLoadingInternal(v);
    if (v) {
      // Clear both visibility queue AND allItems so any pending timeouts
      // from a previous batch cannot later add stale items after new items arrive.
      setAllItems([]);
      setVisibleItems([]);
    }
  }, []);

  const setItems = useCallback((items: BubbleItem[]) => {
    setAllItems(items);
  }, []);

  const handleDismiss = useCallback((id: number) => {
    setVisibleItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleDismissAll = useCallback(() => {
    setVisibleItems([]);
  }, []);

  return {
    visibleItems,
    loading,
    handleDismiss,
    handleDismissAll,
    setItems,
    setLoading,
  };
}
