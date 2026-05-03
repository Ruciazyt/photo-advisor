import { renderHook, act } from '@testing-library/react-native';
import { useSuggestions } from '../hooks/useSuggestions';

describe('useSuggestions', () => {
  it('starts with empty suggestions and loading false', () => {
    const { result } = renderHook(() => useSuggestions());
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('setSuggestions updates suggestions list', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['suggestion 1', 'suggestion 2']);
    });
    expect(result.current.suggestions).toEqual(['suggestion 1', 'suggestion 2']);
  });

  it('setLoading updates loading state', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.loading).toBe(true);
    act(() => {
      result.current.setLoading(false);
    });
    expect(result.current.loading).toBe(false);
  });

  it('handleDismiss removes correct suggestion by index', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['a', 'b', 'c']);
    });
    expect(result.current.suggestions).toHaveLength(3);

    act(() => {
      result.current.handleDismiss(1);
    });
    expect(result.current.suggestions).toEqual(['a', 'c']);
    expect(result.current.suggestions).toHaveLength(2);
  });

  it('handleDismiss does nothing for out-of-range index', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['a', 'b']);
    });
    act(() => {
      result.current.handleDismiss(99);
    });
    expect(result.current.suggestions).toEqual(['a', 'b']);
  });

  it('handleDismissAll clears all suggestions', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['a', 'b', 'c']);
    });
    expect(result.current.suggestions).toHaveLength(3);

    act(() => {
      result.current.handleDismissAll();
    });
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.suggestions).toHaveLength(0);
  });

  it('bubbleItems are derived from suggestions using parseBubbleItemFromText', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['[左上] test', 'plain text', '[中间] center']);
    });
    expect(result.current.bubbleItems).toHaveLength(3);
    expect(result.current.bubbleItems[0]).toMatchObject({
      id: 0,
      text: '[左上] test',
      position: 'top-left',
    });
    expect(result.current.bubbleItems[1].position).toBe('top-right'); // round-robin
    expect(result.current.bubbleItems[2]).toMatchObject({
      id: 2,
      text: '[中间] center',
      position: 'center',
    });
  });

  it('bubbleItems update when suggestions change', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['[左上] first']);
    });
    expect(result.current.bubbleItems).toHaveLength(1);
    expect(result.current.bubbleItems[0].text).toBe('[左上] first');

    act(() => {
      result.current.setSuggestions([]);
    });
    expect(result.current.bubbleItems).toEqual([]);
  });

  // --- Edge case coverage ---

  it('handleDismiss callback is stable across renders (useCallback with empty deps)', () => {
    const { result, rerender } = renderHook(() => useSuggestions());
    const initialRef = result.current.handleDismiss;

    // Change state multiple times
    act(() => {
      result.current.setSuggestions(['a', 'b', 'c']);
    });
    act(() => {
      result.current.setLoading(true);
    });
    act(() => {
      result.current.setSuggestions(['x']);
    });

    // Callback reference must remain identical
    expect(result.current.handleDismiss).toBe(initialRef);
  });

  it('handleDismissAll callback is stable across renders (useCallback with empty deps)', () => {
    const { result } = renderHook(() => useSuggestions());
    const initialRef = result.current.handleDismissAll;

    act(() => {
      result.current.setSuggestions(['a', 'b', 'c']);
    });
    act(() => {
      result.current.setLoading(true);
    });
    act(() => {
      result.current.setSuggestions(['x', 'y']);
    });

    expect(result.current.handleDismissAll).toBe(initialRef);
  });

  it('bubbleItems handles duplicate suggestion texts — IDs remain unique (index-based)', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['same text', 'same text', 'same text']);
    });

    expect(result.current.bubbleItems).toHaveLength(3);
    // IDs must be unique even when texts are identical
    const ids = result.current.bubbleItems.map(b => b.id);
    expect(new Set(ids).size).toBe(3);
    // Each bubbleItem must have a distinct id
    result.current.bubbleItems.forEach(item => {
      expect(ids.filter(id => id === item.id).length).toBe(1);
    });
  });

  it('suggestions replaced with new array — old items are cleared, not merged', () => {
    const { result } = renderHook(() => useSuggestions());
    act(() => {
      result.current.setSuggestions(['old 1', 'old 2', 'old 3']);
    });
    expect(result.current.suggestions).toHaveLength(3);
    expect(result.current.bubbleItems).toHaveLength(3);

    // Replace with a completely new set
    act(() => {
      result.current.setSuggestions(['new A', 'new B']);
    });

    expect(result.current.suggestions).toEqual(['new A', 'new B']);
    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.bubbleItems.map(b => b.text)).toEqual(['new A', 'new B']);
    // Old items must not linger
    expect(result.current.suggestions).not.toContain('old 1');
    expect(result.current.bubbleItems).toHaveLength(2);
  });

  it('empty suggestions array — bubbleItems is empty array', () => {
    const { result } = renderHook(() => useSuggestions());

    act(() => {
      result.current.setSuggestions([]);
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.bubbleItems).toEqual([]);
    expect(result.current.bubbleItems).toHaveLength(0);
  });
});
