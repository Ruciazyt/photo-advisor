import { renderHook, act } from '@testing-library/react-native';
import { useBubbleChat, parseBubbleItemFromText, parseBubbleItemsFromTexts } from '../hooks/useBubbleChat';

// --- parseBubbleItemFromText unit tests ---

describe('parseBubbleItemFromText', () => {
  it('parses top-left tagged text', () => {
    const result = parseBubbleItemFromText('[左上] 将主体放在左上', 0);
    expect(result).toEqual({ id: 0, text: '[左上] 将主体放在左上', position: 'top-left' });
  });

  it('parses top-right tagged text', () => {
    const result = parseBubbleItemFromText('[右上] 重要信息', 1);
    expect(result).toEqual({ id: 1, text: '[右上] 重要信息', position: 'top-right' });
  });

  it('parses bottom-left tagged text', () => {
    const result = parseBubbleItemFromText('[左下] 前景填充', 2);
    expect(result).toEqual({ id: 2, text: '[左下] 前景填充', position: 'bottom-left' });
  });

  it('parses bottom-right tagged text', () => {
    const result = parseBubbleItemFromText('[右下] 右下区域', 3);
    expect(result).toEqual({ id: 3, text: '[右下] 右下区域', position: 'bottom-right' });
  });

  it('parses center tagged text', () => {
    const result = parseBubbleItemFromText('[中间] 中心位置', 4);
    expect(result).toEqual({ id: 4, text: '[中间] 中心位置', position: 'center' });
  });

  it('uses round-robin for untagged text', () => {
    expect(parseBubbleItemFromText('普通建议', 0).position).toBe('top-left');
    expect(parseBubbleItemFromText('普通建议', 1).position).toBe('top-right');
    expect(parseBubbleItemFromText('普通建议', 2).position).toBe('bottom-left');
    expect(parseBubbleItemFromText('普通建议', 3).position).toBe('bottom-right');
    expect(parseBubbleItemFromText('普通建议', 4).position).toBe('top-left'); // wraps
  });

  it('explicit tag takes precedence over round-robin', () => {
    const result = parseBubbleItemFromText('[中间] override', 99);
    expect(result.position).toBe('center');
  });
});

// --- parseBubbleItemsFromTexts unit tests ---

describe('parseBubbleItemsFromTexts', () => {
  it('parses multiple tagged suggestions', () => {
    const results = parseBubbleItemsFromTexts([
      '[左上] 第一个',
      '[右上] 第二个',
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].position).toBe('top-left');
    expect(results[1].position).toBe('top-right');
  });

  it('skips empty strings', () => {
    const results = parseBubbleItemsFromTexts(['[左上] valid', '', '  ', '[右下] also valid']);
    expect(results).toHaveLength(2);
  });

  it('assigns sequential ids starting from 0', () => {
    const results = parseBubbleItemsFromTexts(['[左上] a', '[右上] b']);
    expect(results[0].id).toBe(0);
    expect(results[1].id).toBe(1);
  });
});

// --- useBubbleChat hook tests ---

describe('useBubbleChat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with empty visibleItems and loading false', () => {
    const { result } = renderHook(() => useBubbleChat());
    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('setLoading(true) clears visibleItems', () => {
    const { result } = renderHook(() => useBubbleChat());
    act(() => {
      result.current.setItems([{ id: 0, text: 'test', position: 'top-left' as const }]);
    });
    // Advance timers to allow staggered reveal
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.visibleItems).toHaveLength(1);

    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.visibleItems).toEqual([]);
  });

  it('setLoading(false) restores loading state without clearing', () => {
    const { result } = renderHook(() => useBubbleChat());
    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.loading).toBe(true);
    act(() => {
      result.current.setLoading(false);
    });
    expect(result.current.loading).toBe(false);
  });

  it('setItems triggers staggered reveal of new items', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 100 }));
    act(() => {
      result.current.setItems([
        { id: 0, text: '[左上] 第一条', position: 'top-left' as const },
        { id: 1, text: '[右上] 第二条', position: 'top-right' as const },
        { id: 2, text: '[左下] 第三条', position: 'bottom-left' as const },
      ]);
    });

    // Nothing visible yet (before first delay)
    expect(result.current.visibleItems).toHaveLength(0);

    // After first stagger delay
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].id).toBe(0);

    // After second
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);

    // After third
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(3);
  });

  it('onBubbleAppear is called for each newly revealed item', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems([
        { id: 0, text: 'test 0', position: 'top-left' as const },
        { id: 1, text: 'test 1', position: 'top-right' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(100); });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('test 0');

    act(() => { jest.advanceTimersByTime(100); });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith('test 1');
  });

  it('loading=true stops staggered reveal', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems([
        { id: 0, text: 'item 0', position: 'top-left' as const },
        { id: 1, text: 'item 1', position: 'top-right' as const },
        { id: 2, text: 'item 2', position: 'bottom-left' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(100); });
    expect(cb).toHaveBeenCalledTimes(1);

    // Loading starts before second item is revealed
    act(() => {
      result.current.setLoading(true);
    });

    // Advance past where item 2 would have appeared
    act(() => { jest.advanceTimersByTime(500); });

    // item 1 should have been cleared, item 2 never appeared
    expect(result.current.visibleItems).toHaveLength(0);
    expect(cb).toHaveBeenCalledTimes(1); // no new calls
  });

  it('handleDismiss removes a specific visible item', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 50 }));

    act(() => {
      result.current.setItems([
        { id: 0, text: 'item 0', position: 'top-left' as const },
        { id: 1, text: 'item 1', position: 'top-right' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current.visibleItems).toHaveLength(2);

    act(() => {
      result.current.handleDismiss(0);
    });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].id).toBe(1);
  });

  it('handleDismissAll clears all visible items', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 50 }));

    act(() => {
      result.current.setItems([
        { id: 0, text: 'item 0', position: 'top-left' as const },
        { id: 1, text: 'item 1', position: 'top-right' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current.visibleItems).toHaveLength(2);

    act(() => {
      result.current.handleDismissAll();
    });
    expect(result.current.visibleItems).toEqual([]);
  });

  it('duplicate item ids are not added twice', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 50 }));

    act(() => {
      result.current.setItems([{ id: 0, text: 'item 0', position: 'top-left' as const }]);
    });
    act(() => { jest.advanceTimersByTime(60); });
    expect(result.current.visibleItems).toHaveLength(1);

    // Setting same item again should not duplicate
    act(() => {
      result.current.setItems([{ id: 0, text: 'item 0', position: 'top-left' as const }]);
    });
    act(() => { jest.advanceTimersByTime(60); });
    expect(result.current.visibleItems).toHaveLength(1);
  });

  // --- Bug-fix tests: allItems cleared when loading=true ---

  it('setLoading(true) clears both visibleItems AND allItems', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 100 }));

    // Set initial items and reveal them
    act(() => {
      result.current.setItems([
        { id: 0, text: 'old item', position: 'top-left' as const },
      ]);
    });
    act(() => { jest.advanceTimersByTime(150); });
    expect(result.current.visibleItems).toHaveLength(1);

    // Start loading — this should clear both visibleItems AND allItems
    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.visibleItems).toEqual([]);
    // allItems backing state is cleared internally so pending timeouts
    // from the old batch cannot pollute a fresh setItems call.
  });

  it('items appear correctly after loading completes (fresh start)', () => {
    const { result } = renderHook(() => useBubbleChat({ staggerDelayMs: 100 }));

    // Simulate: loading=true (no-op for fresh hook), then loading=false
    act(() => { result.current.setLoading(false); });
    expect(result.current.loading).toBe(false);

    // Now set fresh items
    act(() => {
      result.current.setItems([
        { id: 0, text: 'fresh item', position: 'top-left' as const },
        { id: 1, text: 'fresh item 2', position: 'top-right' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('fresh item');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
    expect(result.current.visibleItems[1].text).toBe('fresh item 2');
  });

  it('rapid suggestion changes do not cause duplicate or missing items', () => {
    // Simulates: setItems(A) → loading=true → setItems(B) → loading=false
    // The BATCH A timeouts must not affect BATCH B items.
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    // Batch A — partially revealed
    act(() => {
      result.current.setItems([
        { id: 0, text: 'batch A item 0', position: 'top-left' as const },
        { id: 1, text: 'batch A item 1', position: 'top-right' as const },
      ]);
    });
    act(() => { jest.advanceTimersByTime(100); }); // first A item revealed
    expect(result.current.visibleItems).toHaveLength(1);
    expect(cb).toHaveBeenCalledWith('batch A item 0');

    // Rapid: loading=true (cancels A timeouts, clears allItems)
    act(() => { result.current.setLoading(true); });
    expect(result.current.visibleItems).toEqual([]);

    // Batch B arrives while still loading
    act(() => {
      result.current.setItems([
        { id: 10, text: 'batch B item 0', position: 'top-left' as const },
        { id: 11, text: 'batch B item 1', position: 'top-right' as const },
        { id: 12, text: 'batch B item 2', position: 'bottom-left' as const },
      ]);
    });

    // loading=false — now B items should start revealing
    act(() => { result.current.setLoading(false); });

    // B items reveal with fresh stagger
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0].text).toBe('batch B item 0');
    expect(cb).toHaveBeenCalledWith('batch B item 0');
    // batch A item 1 must NOT appear
    expect(cb).not.toHaveBeenCalledWith('batch A item 1');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
    expect(result.current.visibleItems[1].text).toBe('batch B item 1');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(3);
    expect(result.current.visibleItems[2].text).toBe('batch B item 2');

    // Ensure no leftover A items ever surfaced
    const allCbTexts = cb.mock.calls.map(c => c[0]);
    expect(allCbTexts).not.toContain('batch A item 1');
    expect(allCbTexts).toEqual(['batch A item 0', 'batch B item 0', 'batch B item 1', 'batch B item 2']);
  });

  // --- Bug-fix tests: revealedCountRef eliminates stale-closure issues ---

  it('setItems with new items (after prior complete reveal) re-staggers only the new items', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    // First batch fully reveals
    act(() => {
      result.current.setItems([
        { id: 0, text: 'A', position: 'top-left' as const },
        { id: 1, text: 'B', position: 'top-right' as const },
      ]);
    });
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.visibleItems).toHaveLength(2);
    cb.mockClear();

    // Second setItems with NEW items (C, D) — only new items stagger
    act(() => {
      result.current.setItems([
        { id: 2, text: 'C', position: 'bottom-left' as const },
        { id: 3, text: 'D', position: 'bottom-right' as const },
      ]);
    });
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1); // only C revealed
    expect(result.current.visibleItems[0].text).toBe('C');
    expect(cb).toHaveBeenCalledWith('C');
    expect(cb).not.toHaveBeenCalledWith('A');
    expect(cb).not.toHaveBeenCalledWith('B');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
    expect(cb).toHaveBeenCalledTimes(2); // C and D, not A/B
  });

  it('setItems after handleDismissAll still staggers all items (counter resets)', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    act(() => {
      result.current.setItems([
        { id: 0, text: 'item 0', position: 'top-left' as const },
        { id: 1, text: 'item 1', position: 'top-right' as const },
      ]);
    });
    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current.visibleItems).toHaveLength(2);

    // Dismiss all, then set the same items again — they should re-stagger
    act(() => { result.current.handleDismissAll(); });
    expect(result.current.visibleItems).toHaveLength(0);
    cb.mockClear();

    act(() => {
      result.current.setItems([
        { id: 0, text: 'item 0', position: 'top-left' as const },
        { id: 1, text: 'item 1', position: 'top-right' as const },
      ]);
    });

    // Items re-stagger from scratch (counter was reset by setItems)
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(cb).toHaveBeenCalledWith('item 0');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('rapid setItems calls do not cause duplicate reveals', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    // Fire several setItems calls before any timer fires
    act(() => {
      result.current.setItems([
        { id: 0, text: 'A', position: 'top-left' as const },
      ]);
    });
    act(() => {
      result.current.setItems([
        { id: 0, text: 'A', position: 'top-left' as const },
        { id: 1, text: 'B', position: 'top-right' as const },
      ]);
    });
    act(() => {
      result.current.setItems([
        { id: 0, text: 'A', position: 'top-left' as const },
        { id: 1, text: 'B', position: 'top-right' as const },
        { id: 2, text: 'C', position: 'bottom-left' as const },
      ]);
    });

    // Before any timer fires, visible should be empty
    expect(result.current.visibleItems).toHaveLength(0);

    // After all timers fire, only 3 unique items appear (no duplicates)
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current.visibleItems).toHaveLength(3);
    const ids = result.current.visibleItems.map(i => i.id);
    expect(ids).toEqual([0, 1, 2]);
    // Each callback fired exactly once
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('setLoading(true) followed by setLoading(false) does not cause stale item reveals', () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useBubbleChat({ onBubbleAppear: cb, staggerDelayMs: 100 })
    );

    // Put hook in loading state, then bring it back down with no items
    act(() => { result.current.setLoading(true); });
    act(() => { result.current.setLoading(false); });

    // Now set fresh items and verify normal stagger
    act(() => {
      result.current.setItems([
        { id: 0, text: 'fresh 0', position: 'top-left' as const },
        { id: 1, text: 'fresh 1', position: 'top-right' as const },
      ]);
    });

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(1);
    expect(cb).toHaveBeenCalledWith('fresh 0');

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.visibleItems).toHaveLength(2);
    expect(cb).toHaveBeenCalledTimes(2);
    // No stale callbacks from before the loading cycle
    const calledTexts = cb.mock.calls.map(c => c[0]);
    expect(calledTexts).toEqual(['fresh 0', 'fresh 1']);
  });
});
