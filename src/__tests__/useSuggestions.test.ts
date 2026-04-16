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
});
