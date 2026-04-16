/**
 * useSuggestions — manages AI suggestion strings and their bubble item representations.
 *
 * Responsibilities:
 * - Store raw suggestion strings from AI analysis
 * - Loading state during suggestion generation
 * - Individual and bulk dismiss of suggestions
 * - Derive BubbleItem[] for overlay display
 */

import { useState, useCallback, useMemo } from 'react';
import { parseBubbleItemFromText } from './useBubbleChat';
import type { BubbleItem } from '../types';

export interface UseSuggestionsReturn {
  suggestions: string[];
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleDismiss: (id: number) => void;
  handleDismissAll: () => void;
  bubbleItems: BubbleItem[];
}

export function useSuggestions(): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDismiss = useCallback((id: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== id));
  }, []);

  const handleDismissAll = useCallback(() => {
    setSuggestions([]);
  }, []);

  const bubbleItems = useMemo(
    () => suggestions.map((text, i) => parseBubbleItemFromText(text, i)),
    [suggestions],
  );

  return {
    suggestions,
    setSuggestions,
    loading,
    setLoading,
    handleDismiss,
    handleDismissAll,
    bubbleItems,
  };
}
