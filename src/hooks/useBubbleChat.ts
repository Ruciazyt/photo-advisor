/**
 * useBubbleChat — manages staggered bubble item appearance and dismissal.
 *
 * Responsibilities:
 * - Track which items are currently visible (staggered reveal)
 * - Individual and bulk dismiss
 * - Loading state clears visible items
 * - Callback for voice feedback on new bubble appear
 */

import { useReducer, useCallback, useEffect, useRef } from 'react';
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

// --- Reducer state & action types ---

interface BubbleChatState {
  allItems: BubbleItem[];
  visibleItems: BubbleItem[];
  loading: boolean;
}

type BubbleChatAction =
  | { type: 'SET_ALL_ITEMS'; payload: BubbleItem[] }
  | { type: 'ADD_VISIBLE_ITEM'; payload: BubbleItem }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_VISIBLE' }
  | { type: 'DISMISS'; payload: number }
  | { type: 'CLEAR_ALL' };

function bubbleChatReducer(
  state: BubbleChatState,
  action: BubbleChatAction
): BubbleChatState {
  switch (action.type) {
    case 'SET_ALL_ITEMS':
      return { ...state, allItems: action.payload };
    case 'ADD_VISIBLE_ITEM':
      return {
        ...state,
        visibleItems: state.visibleItems.find((i) => i.id === action.payload.id)
          ? state.visibleItems
          : [...state.visibleItems, action.payload],
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_VISIBLE':
      return { ...state, visibleItems: [] };
    case 'CLEAR_ALL':
      return { ...state, allItems: [], visibleItems: [] };
    case 'DISMISS':
      return {
        ...state,
        visibleItems: state.visibleItems.filter((i) => i.id !== action.payload),
      };
    default:
      return state;
  }
}

// --- Hook ---

export function useBubbleChat({
  onBubbleAppear,
  staggerDelayMs = 250,
}: UseBubbleChatOptions = {}): UseBubbleChatReturn {
  const [{ allItems, visibleItems, loading }, dispatch] = useReducer(
    bubbleChatReducer,
    {
      allItems: [],
      visibleItems: [],
      loading: false,
    }
  );

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

        dispatch({ type: 'ADD_VISIBLE_ITEM', payload: item });
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
    dispatch({ type: 'SET_LOADING', payload: v });
    if (v) {
      // Clear both visibility queue AND allItems so any pending timeouts
      // from a previous batch cannot later add stale items after new items arrive.
      dispatch({ type: 'CLEAR_ALL' });
      revealedCountRef.current = 0;
    }
  }, []);

  const setItems = useCallback((items: BubbleItem[]) => {
    revealedCountRef.current = 0;
    dispatch({ type: 'CLEAR_VISIBLE' });
    dispatch({ type: 'SET_ALL_ITEMS', payload: items });
  }, []);

  const handleDismiss = useCallback((id: number) => {
    dispatch({ type: 'DISMISS', payload: id });
  }, []);

  const handleDismissAll = useCallback(() => {
    dispatch({ type: 'CLEAR_VISIBLE' });
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
