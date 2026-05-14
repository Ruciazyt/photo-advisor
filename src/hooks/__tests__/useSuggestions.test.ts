/**
 * Unit tests for src/hooks/useSuggestions.ts
 *
 * Covers:
 * - Initial state (empty suggestions, loading=false)
 * - setSuggestions updates suggestions array
 * - handleDismiss removes single suggestion by index
 * - handleDismissAll clears all suggestions
 * - bubbleItems derivation from suggestions via parseBubbleItemFromText
 * - loading state management via setLoading
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSuggestions } from '../useSuggestions';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated (same pattern as existing tests)
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () => ({}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBubble(id: number, text: string, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'top-left') {
  return { id, text, position };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Return value shape
  // -------------------------------------------------------------------------
  describe('return value shape', () => {
    it('exposes all required fields', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current).toHaveProperty('suggestions');
      expect(result.current).toHaveProperty('setSuggestions');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('setLoading');
      expect(result.current).toHaveProperty('handleDismiss');
      expect(result.current).toHaveProperty('handleDismissAll');
      expect(result.current).toHaveProperty('bubbleItems');
    });

    it('setSuggestions, setLoading, handleDismiss, handleDismissAll are functions', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(typeof result.current.setSuggestions).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.handleDismiss).toBe('function');
      expect(typeof result.current.handleDismissAll).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with empty suggestions array', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.suggestions).toEqual([]);
    });

    it('starts with loading=false', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.loading).toBe(false);
    });

    it('starts with empty bubbleItems', () => {
      const { result } = renderHook(() => useSuggestions());
      expect(result.current.bubbleItems).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // setSuggestions
  // -------------------------------------------------------------------------
  describe('setSuggestions', () => {
    it('updates suggestions array with provided values', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['构图不错', '试试三分法']);
      });

      expect(result.current.suggestions).toEqual(['构图不错', '试试三分法']);
    });

    it('setSuggestions with functional update receives current state', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['first']);
      });

      act(() => {
        result.current.setSuggestions(prev => [...prev, 'second']);
      });

      expect(result.current.suggestions).toEqual(['first', 'second']);
    });

    it('setSuggestions([]) clears suggestions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      act(() => {
        result.current.setSuggestions([]);
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // handleDismiss
  // -------------------------------------------------------------------------
  describe('handleDismiss', () => {
    it('removes single suggestion by index', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['第一条', '第二条', '第三条']);
      });

      act(() => {
        result.current.handleDismiss(1);
      });

      expect(result.current.suggestions).toEqual(['第一条', '第三条']);
    });

    it('handles dismiss of first element', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['first', 'second']);
      });

      act(() => {
        result.current.handleDismiss(0);
      });

      expect(result.current.suggestions).toEqual(['second']);
    });

    it('handles dismiss of last element', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['first', 'second']);
      });

      act(() => {
        result.current.handleDismiss(1);
      });

      expect(result.current.suggestions).toEqual(['first']);
    });

    it('dismissing out-of-range index is a no-op', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['only']);
      });

      act(() => {
        result.current.handleDismiss(99);
      });

      expect(result.current.suggestions).toEqual(['only']);
    });

    it('dismissing on empty suggestions is a no-op', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.handleDismiss(0);
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // handleDismissAll
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // setLoading
  // -------------------------------------------------------------------------
  describe('setLoading', () => {
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

    it('setLoading toggles correctly', () => {
      const { result } = renderHook(() => useSuggestions());

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });
      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // bubbleItems derivation
  // -------------------------------------------------------------------------
  describe('bubbleItems', () => {
    it('derives bubbleItems from suggestions using parseBubbleItemFromText', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['构图不错']);
      });

      expect(result.current.bubbleItems).toHaveLength(1);
      expect(result.current.bubbleItems[0].text).toBe('构图不错');
      expect(result.current.bubbleItems[0].position).toBe('top-left'); // round-robin id=0
    });

    it('multiple suggestions produce multiple bubble items with round-robin positions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['第一句', '第二句', '第三句', '第四句']);
      });

      const items = result.current.bubbleItems;
      expect(items).toHaveLength(4);
      expect(items[0].position).toBe('top-left');
      expect(items[1].position).toBe('top-right');
      expect(items[2].position).toBe('bottom-left');
      expect(items[3].position).toBe('bottom-right');
    });

    it('bubbleItems updates when suggestions change', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['原始建议']);
      });
      expect(result.current.bubbleItems).toHaveLength(1);
      expect(result.current.bubbleItems[0].text).toBe('原始建议');

      act(() => {
        result.current.setSuggestions(['新建议一', '新建议二']);
      });

      const items = result.current.bubbleItems;
      expect(items).toHaveLength(2);
      expect(items[0].text).toBe('新建议一');
      expect(items[1].text).toBe('新建议二');
    });

    it('bubbleItems is empty when suggestions is empty', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions([]);
      });

      expect(result.current.bubbleItems).toEqual([]);
    });

    it('bubbleItems ids are 0-indexed within each batch', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['item1', 'item2']);
      });

      expect(result.current.bubbleItems[0].id).toBe(0);
      expect(result.current.bubbleItems[1].id).toBe(1);
    });

    it('suggestions with bracketed position tags produce bubble items with explicit positions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['[左上] 左上内容', '[右下] 右下内容']);
      });

      const items = result.current.bubbleItems;
      expect(items[0].position).toBe('top-left');
      expect(items[1].position).toBe('bottom-right');
    });
  });

  // -------------------------------------------------------------------------
  // Integration: suggestions + loading interaction
  // -------------------------------------------------------------------------
  describe('suggestions and loading interaction', () => {
    it('setSuggestions while loading=true does not affect loading state', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setSuggestions(['a', 'b']);
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.suggestions).toEqual(['a', 'b']);
    });

    it('bubbleItems reflects suggestions even when loading is true', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setSuggestions(['test']);
      });

      expect(result.current.bubbleItems).toHaveLength(1);
      expect(result.current.bubbleItems[0].text).toBe('test');
    });

    it('handleDismissAll while loading=false clears suggestions', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['a', 'b', 'c']);
      });

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.bubbleItems).toEqual([]);
    });

    it('dismiss then add works correctly', () => {
      const { result } = renderHook(() => useSuggestions());

      act(() => {
        result.current.setSuggestions(['first', 'second']);
      });

      act(() => {
        result.current.handleDismiss(0);
      });

      act(() => {
        result.current.setSuggestions(prev => [...prev, 'third']);
      });

      expect(result.current.suggestions).toEqual(['second', 'third']);
    });
  });
});