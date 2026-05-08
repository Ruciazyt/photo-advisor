/**
 * Unit tests for src/hooks/useBubbleChat.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBubbleChat } from '../useBubbleChat';
import type { BubbleItem } from '../types';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBubble(id: number, text: string): BubbleItem {
  return { id, text };
}

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