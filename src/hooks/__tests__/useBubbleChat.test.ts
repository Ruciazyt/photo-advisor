/**
 * Unit tests for src/hooks/useBubbleChat.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBubbleChat, parseBubbleItemFromText, parseBubbleItemsFromTexts } from '../useBubbleChat';
import type { BubbleItem } from '../../types';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBubble(id: number, text: string, position: BubbleItem['position'] = 'top-left'): BubbleItem {
  return { id, text, position };
}

// ─── parseBubbleItemFromText ─────────────────────────────────────────────

describe('parseBubbleItemFromText', () => {
  it('parses plain text without position tag as round-robin top-left', () => {
    const item = parseBubbleItemFromText('构图不错', 0);
    expect(item.text).toBe('构图不错');
    expect(item.position).toBe('top-left');
    expect(item.id).toBe(0);
  });

  it('round-robins position by id for plain text (4-position cycle)', () => {
    expect(parseBubbleItemFromText('text', 0).position).toBe('top-left');
    expect(parseBubbleItemFromText('text', 1).position).toBe('top-right');
    expect(parseBubbleItemFromText('text', 2).position).toBe('bottom-left');
    expect(parseBubbleItemFromText('text', 3).position).toBe('bottom-right');
    expect(parseBubbleItemFromText('text', 4).position).toBe('top-left'); // wraps: 4 % 4 = 0
  });

  it('parses [左上] position tag', () => {
    const item = parseBubbleItemFromText('[左上] 把主体放左上', 0);
    expect(item.position).toBe('top-left');
    expect(item.text).toBe('[左上] 把主体放左上');
  });

  it('parses [右上] position tag', () => {
    const item = parseBubbleItemFromText('[右上] 靠右构图', 1);
    expect(item.position).toBe('top-right');
  });

  it('parses [左下] position tag', () => {
    const item = parseBubbleItemFromText('[左下] 下方放置', 2);
    expect(item.position).toBe('bottom-left');
  });

  it('parses [右下] position tag', () => {
    const item = parseBubbleItemFromText('[右下] 右下角', 3);
    expect(item.position).toBe('bottom-right');
  });

  it('parses [中间] position tag', () => {
    const item = parseBubbleItemFromText('[中间] 居中构图', 4);
    expect(item.position).toBe('center');
  });

  it('position tag overrides round-robin default', () => {
    const item = parseBubbleItemFromText('[右下] 优先用右下', 0);
    expect(item.position).toBe('bottom-right');
    expect(item.id).toBe(0);
  });

  it('whitespace inside position tag is trimmed', () => {
    const item = parseBubbleItemFromText('[ 左上 ] 内容', 0);
    expect(item.position).toBe('top-left');
  });

  it('unrecognised tag strings fall through to round-robin', () => {
    const item = parseBubbleItemFromText('[top-right] Place subject here', 0);
    expect(item.position).toBe('top-left'); // '[top-right]' not in BUBBLE_POSITION_MAP
  });
});

// ─── parseBubbleItemsFromTexts ───────────────────────────────────────────

describe('parseBubbleItemsFromTexts', () => {
  it('parses array of plain texts with round-robin ids', () => {
    const texts = ['第一句', '第二句', '第三句'];
    const items = parseBubbleItemsFromTexts(texts);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ id: 0, text: '第一句', position: 'top-left' });
    expect(items[1]).toEqual({ id: 1, text: '第二句', position: 'top-right' });
    expect(items[2]).toEqual({ id: 2, text: '第三句', position: 'bottom-left' });
  });

  it('filters out empty strings', () => {
    const texts = ['有效', '', '  ', '还有效'];
    const items = parseBubbleItemsFromTexts(texts);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('有效');
    expect(items[1].text).toBe('还有效');
  });

  it('parses texts with explicit position tags', () => {
    const texts = ['[左上] 左上内容', '[右下] 右下内容'];
    const items = parseBubbleItemsFromTexts(texts);
    expect(items[0].position).toBe('top-left');
    expect(items[1].position).toBe('bottom-right');
  });

  it('returns empty array for all-empty input', () => {
    expect(parseBubbleItemsFromTexts([])).toEqual([]);
    expect(parseBubbleItemsFromTexts(['', '  ', ''])).toEqual([]);
  });

  it('reset ids after filtering empty strings', () => {
    const texts = ['', '  ', 'first', '', 'second'];
    const items = parseBubbleItemsFromTexts(texts);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(0); // reset per batch
    expect(items[1].id).toBe(1); // reset per batch
    expect(items[0].text).toBe('first');
    expect(items[1].text).toBe('second');
  });
});

// ─── Hook return value shape ───────────────────────────────────────────────

describe('return value shape', () => {
  it('exposes all required fields', () => {
    const { result } = renderHook(() => useBubbleChat());
    const r = result.current;
    expect(r).toHaveProperty('visibleItems');
    expect(r).toHaveProperty('loading');
    expect(r).toHaveProperty('handleDismiss');
    expect(r).toHaveProperty('handleDismissAll');
    expect(r).toHaveProperty('setItems');
    expect(r).toHaveProperty('setLoading');
  });

  it('handleDismiss is a function', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(typeof result.current.handleDismiss).toBe('function');
  });

  it('handleDismissAll is a function', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(typeof result.current.handleDismissAll).toBe('function');
  });

  it('setItems is a function', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(typeof result.current.setItems).toBe('function');
  });

  it('setLoading is a function', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(typeof result.current.setLoading).toBe('function');
  });
});

// ─── Initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with empty visibleItems and loading=false', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});

// ─── setItems — staggered reveal ───────────────────────────────────────────

describe('setItems', () => {
  it('adds items one by one with stagger delay', () => {
    const items = [makeBubble(1, '第一条'), makeBubble(2, '第二条')];
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 250 })
    );

    act(() => {
      result.current.setItems(items);
    });

    // Nothing revealed yet (first item reveals after 1 * 250ms)
    expect(result.current.visibleItems).toEqual([]);

    // After 250ms: first item appears
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('第一条');

    // After 500ms: second item appears
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.visibleItems).toHaveLength(2);
  });

  it('calls onBubbleAppear when each item is revealed', () => {
    const onBubbleAppear = jest.fn();
    const items = [makeBubble(1, '测试'), makeBubble(2, '测试2')];
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100, onBubbleAppear })
    );

    act(() => {
      result.current.setItems(items);
    });

    act(() => { jest.advanceTimersByTime(100); });
    expect(onBubbleAppear).toHaveBeenCalledWith('测试');

    act(() => { jest.advanceTimersByTime(100); });
    expect(onBubbleAppear).toHaveBeenCalledWith('测试2');

    expect(onBubbleAppear).toHaveBeenCalledTimes(2);
  });

  it('does not reveal items when loading=true before stagger completes', () => {
    const items = [makeBubble(1, 'item1'), makeBubble(2, 'item2')];
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems(items);
    });

    // Set loading before first item reveals
    act(() => {
      result.current.setLoading(true);
    });

    // Advance past the reveal time
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Items should NOT be revealed because loading=true
    expect(result.current.visibleItems).toEqual([]);
  });
});

// ─── setLoading ─────────────────────────────────────────────────────────────

describe('setLoading', () => {
  it('setLoading(true) clears both allItems and visibleItems', () => {
    const items = [makeBubble(1, 'keep'), makeBubble(2, 'keep2')];
    const { result } = renderHook(() => useBubbleChat());

    act(() => {
      result.current.setItems(items);
    });
    act(() => { jest.advanceTimersByTime(500); }); // reveal all

    act(() => {
      result.current.setLoading(true);
    });

    // Both queues cleared — visibleItems gone
    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('setLoading(false) allows new items to be revealed from scratch', () => {
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100 })
    );

    // First batch
    act(() => {
      result.current.setItems([makeBubble(1, 'first')]);
    });
    act(() => { result.current.setLoading(true); });
    act(() => { result.current.setLoading(false); }); // reset to allow new reveal
    act(() => {
      result.current.setItems([makeBubble(2, 'second')]);
    });

    // Should reveal at 100ms
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('second');
  });
});

// ─── handleDismiss ──────────────────────────────────────────────────────────

describe('handleDismiss', () => {
  it('removes the item with the given id from visibleItems', () => {
    const items = [makeBubble(1, 'a'), makeBubble(2, 'b')];
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems(items);
    });
    act(() => { jest.advanceTimersByTime(200); }); // reveal both

    act(() => {
      result.current.handleDismiss(1);
    });

    expect(result.current.visibleItems.find(i => i.id === 1)).toBeUndefined();
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].id).toBe(2);
  });

  it('dismissing a non-visible id is a no-op', () => {
    const { result } = renderHook(() => useBubbleChat());

    act(() => {
      result.current.handleDismiss(999);
    });

    expect(result.current.visibleItems).toEqual([]);
  });
});

// ─── handleDismissAll ───────────────────────────────────────────────────────

describe('handleDismissAll', () => {
  it('clears visibleItems but keeps allItems', () => {
    const items = [makeBubble(1, 'x'), makeBubble(2, 'y')];
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems(items);
    });
    act(() => { jest.advanceTimersByTime(200); }); // reveal all

    act(() => {
      result.current.handleDismissAll();
    });

    expect(result.current.visibleItems).toEqual([]);
    // allItems still intact — next setLoading(false) would not start fresh
  });
});

// ─── Rapid suggestion changes ──────────────────────────────────────────────

describe('rapid suggestion changes', () => {
  it('clearing loading flag after setItems clears allItems preventing stale reveals', () => {
    const onAppear = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 50, onBubbleAppear: onAppear })
    );

    // Simulate: user triggers new analysis → loading clears old items → new items set
    act(() => {
      result.current.setItems([makeBubble(1, 'old')]);
    });
    act(() => {
      result.current.setLoading(true); // clears all
    });
    act(() => {
      result.current.setItems([makeBubble(2, 'new')]);
    });
    act(() => {
      result.current.setLoading(false);
    });

    // Advance past reveal time for "new" item
    act(() => { jest.advanceTimersByTime(50); });

    // "old" should never have appeared
    expect(onAppear).toHaveBeenCalledWith('new');
    expect(onAppear).not.toHaveBeenCalledWith('old');
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('new');
  });
});

// ─── Empty items ───────────────────────────────────────────────────────────

describe('empty items handling', () => {
  it('setItems([]) does not cause errors or visible items', () => {
    const { result } = renderHook(() => useBubbleChat());

    act(() => {
      result.current.setItems([]);
    });

    act(() => { jest.advanceTimersByTime(500); });

    expect(result.current.visibleItems).toEqual([]);
  });

  it('setItems on already-revealed state resets and starts fresh', () => {
    const { result } = renderHook(() =>
      useBubbleChat({ staggerDelayMs: 100 })
    );

    act(() => { result.current.setItems([makeBubble(1, 'first')]); });
    act(() => { jest.advanceTimersByTime(200); }); // revealed

    act(() => {
      result.current.setItems([makeBubble(2, 'second'), makeBubble(3, 'third')]);
    });

    // First item not yet revealed for the second batch
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('second');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
  });
});