/**
 * Unit tests for src/hooks/useSuggestions.ts
 *
 * Tested:
 * - Initial state (empty suggestions, loading=false)
 * - setSuggestions updates suggestions array
 * - handleDismiss removes single suggestion by index
 * - handleDismissAll clears all suggestions
 * - bubbleItems is derived correctly from suggestions using parseBubbleItemFromText
 * - loading state management
 * - setLoading sets loading flag
 * - Multiple suggestions → multiple bubble items with correct positions
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSuggestions } from '../useSuggestions';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated (used throughout the codebase)
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () => ({}));

describe('useSuggestions', () => {
  // ─── Initial state ──────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty suggestions and loading=false', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  // ─── setSuggestions ──────────────────────────────────────────────────────

  describe('setSuggestions', () => {
    it('updates the suggestions array', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['构图不错', '光线偏暗']);
      });

      expect(result.current.suggestions).toEqual(['构图不错', '光线偏暗']);
    });

    it('setSuggestions with empty array clears suggestions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['some suggestion']);
      });
      expect(result.current.suggestions).toHaveLength(1);

      act(() => {
        result.current.setSuggestions([]);
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  // ─── handleDismiss ────────────────────────────────────────────────────────

  describe('handleDismiss', () => {
    it('removes the suggestion at the given index', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['第一句', '第二句', '第三句']);
      });

      act(() => {
        result.current.handleDismiss(1);
      });

      expect(result.current.suggestions).toEqual(['第一句', '第三句']);
    });

    it('removing first item shifts subsequent items', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      act(() => {
        result.current.handleDismiss(0);
      });

      expect(result.current.suggestions).toEqual(['b', 'c']);
    });

    it('dismissing out-of-range index is a no-op', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['only one']);
      });

      act(() => {
        result.current.handleDismiss(99);
      });

      expect(result.current.suggestions).toEqual(['only one']);
    });
  });

  // ─── handleDismissAll ───────────────────────────────────────────────────

  describe('handleDismissAll', () => {
    it('clears all suggestions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it('handleDismissAll on already-empty suggestions is safe', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  // ─── bubbleItems derivation ──────────────────────────────────────────────

  describe('bubbleItems', () => {
    it('bubbleItems is initially empty for empty suggestions', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.bubbleItems).toEqual([]);
    });

    it('bubbleItems is derived from suggestions using parseBubbleItemFromText', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['构图不错']);
      });

      expect(result.current.bubbleItems).toHaveLength(1);
      expect(result.current.bubbleItems[0].text).toBe('构图不错');
    });

    it('bubbleItems updates when setSuggestions is called', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['first', 'second']);
      });

      expect(result.current.bubbleItems).toHaveLength(2);
      expect(result.current.bubbleItems[0].text).toBe('first');
      expect(result.current.bubbleItems[1].text).toBe('second');
    });

    it('bubbleItems is empty after handleDismissAll', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b']);
      });

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.bubbleItems).toEqual([]);
    });

    it('bubbleItems shrinks after handleDismiss removes a suggestion', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      act(() => {
        result.current.handleDismiss(1);
      });

      expect(result.current.bubbleItems).toHaveLength(2);
    });
  });

  // ─── loading state ───────────────────────────────────────────────────────

  describe('loading state', () => {
    it('starts with loading=false', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.loading).toBe(false);
    });

    it('setLoading(true) sets loading to true', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('setLoading(false) sets loading to false', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setLoading(true);
      });
      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('setLoading does not affect suggestions array', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['keep me']);
      });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.suggestions).toEqual(['keep me']);
      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.suggestions).toEqual(['keep me']);
    });
  });

  // ─── Multiple suggestions with positions ────────────────────────────────

  describe('multiple suggestions → bubble item positions', () => {
    it('maps multiple suggestions to bubble items with round-robin positions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['一', '二', '三', '四', '五']);
      });

      const items = result.current.bubbleItems;
      expect(items).toHaveLength(5);
      // Round-robin positions: top-left, top-right, bottom-left, bottom-right, top-left (wrap)
      expect(items[0].position).toBe('top-left');
      expect(items[1].position).toBe('top-right');
      expect(items[2].position).toBe('bottom-left');
      expect(items[3].position).toBe('bottom-right');
      expect(items[4].position).toBe('top-left');
    });

    it('assigns correct ids to bubble items based on array index', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      const items = result.current.bubbleItems;
      expect(items[0].id).toBe(0);
      expect(items[1].id).toBe(1);
      expect(items[2].id).toBe(2);
    });

    it('parses explicit position tags from suggestion text', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['[右上] 靠右构图', '[左下] 下方放置']);
      });

      const items = result.current.bubbleItems;
      expect(items[0].position).toBe('top-right');
      expect(items[1].position).toBe('bottom-left');
    });
  });

  // ─── Return value shape ──────────────────────────────────────────────────

  describe('return value shape', () => {
    it('exposes all required fields', () => {
      const { result } = renderHook(() => useSuggestions());
      const r = result.current;
      expect(r).toHaveProperty('suggestions');
      expect(r).toHaveProperty('setSuggestions');
      expect(r).toHaveProperty('loading');
      expect(r).toHaveProperty('setLoading');
      expect(r).toHaveProperty('handleDismiss');
      expect(r).toHaveProperty('handleDismissAll');
      expect(r).toHaveProperty('bubbleItems');
    });

    it('all function fields are functions', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(typeof result.current.setSuggestions).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.handleDismiss).toBe('function');
      expect(typeof result.current.handleDismissAll).toBe('function');
    });
  });
});