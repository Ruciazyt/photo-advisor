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
import type { BubbleItem } from '../types';

// Shared parsing utilities — single source of truth
import {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
} from '../utils/parsing';

// Re-export for callers that import from useBubbleChat
export { parseBubbleItemFromText, parseBubbleItemsFromTexts };

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

export function useBubbleChat({
  onBubbleAppear,
  staggerDelayMs = 250,
}: UseBubbleChatOptions = {}): UseBubbleChatReturn {
  const [allItems, setAllItems] = useState<BubbleItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<BubbleItem[]>([]);
  const [loading, setLoadingInternal] = useState(false);

  // Tracks how many items have been revealed so far — used instead of
  // visibleItems.length to avoid a stale-closure / dependency-cycle bug.
  const revealedCountRef = useRef(0);

  // Keep latest loading flag accessible in setTimeout closures
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // When allItems changes, show new items one by one with stagger
  useEffect(() => {
    if (allItems.length === 0) return;

    const newItems = allItems.slice(revealedCountRef.current);
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
        revealedCountRef.current += 1;
        onBubbleAppear?.(item.text);
      }, delay);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, staggerDelayMs, onBubbleAppear]);

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
      revealedCountRef.current = 0;
    }
  }, []);

  const setItems = useCallback((items: BubbleItem[]) => {
    revealedCountRef.current = 0;
    setVisibleItems([]); // clear stale visible items for a clean slate
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
