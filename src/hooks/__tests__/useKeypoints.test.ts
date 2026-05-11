/**
 * Unit tests for src/hooks/useKeypoints.ts
 *
 * Covers:
 * - initial state (empty keypoints, showKeypoints=false)
 * - deriveKeypoints: parsing, empty input, id persistence across calls
 * - handleDismiss: removes by id, hides overlay when last keypoint dismissed
 * - handleDismissAll: clears everything
 * - setShowKeypoints: manual visibility control + callback
 * - setKeypoints: direct state manipulation
 * - onVisibilityChange callback integration
 */

import { renderHook, act } from '@testing-library/react-native';
import { useKeypoints, parseKeypointFromText } from '../useKeypoints';
import type { Keypoint } from '../../types';

// ---------------------------------------------------------------------------
// parseKeypointFromText — re-exported from useKeypoints
// ---------------------------------------------------------------------------

describe('parseKeypointFromText (re-exported from useKeypoints)', () => {
  it('parses bracketed-label format into Keypoint', () => {
    const kp = parseKeypointFromText('[左上] 将主体放在左侧', 0);
    expect(kp).not.toBeNull();
    expect(kp!.label).toBe('左上');
    expect(kp!.instruction).toBe('将主体放在左侧');
    expect(kp!.position).toBe('top-left');
    expect(kp!.id).toBe(0);
  });

  it('returns null for strings without bracketed label', () => {
    expect(parseKeypointFromText('普通建议文字', 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useKeypoints — core hook
// ---------------------------------------------------------------------------

describe('useKeypoints', () => {
  describe('initial state', () => {
    it('starts with empty keypoints array', () => {
      const { result } = renderHook(() => useKeypoints());
      expect(result.current.keypoints).toEqual([]);
    });

    it('starts with showKeypoints set to false', () => {
      const { result } = renderHook(() => useKeypoints());
      expect(result.current.showKeypoints).toBe(false);
    });
  });

  describe('deriveKeypoints', () => {
    it('parses bracketed-label suggestions into Keypoint objects', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] 将主体放在左侧三分线', '[右下] 右侧留白过多']);
      });

      expect(result.current.keypoints).toHaveLength(2);
      expect(result.current.keypoints[0].label).toBe('左上');
      expect(result.current.keypoints[0].instruction).toBe('将主体放在左侧三分线');
      expect(result.current.keypoints[0].position).toBe('top-left');
      expect(result.current.keypoints[1].label).toBe('右下');
      expect(result.current.keypoints[1].position).toBe('bottom-right');
    });

    it('sets showKeypoints to true when at least one valid keypoint is derived', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[中间] 主体居中']);
      });

      expect(result.current.showKeypoints).toBe(true);
    });

    it('skips empty strings when deriving', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] 有效', '', '  ', '[右下] 也有效']);
      });

      expect(result.current.keypoints).toHaveLength(2);
    });

    it('skips non-bracketed strings (returns null from parseKeypointFromText)', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['普通建议没有标签', '也不是有效']);
      });

      expect(result.current.keypoints).toEqual([]);
    });

    it('derives showKeypoints=true only when at least one valid kp is found', () => {
      const { result } = renderHook(() => useKeypoints());

      // Only invalid strings → showKeypoints stays false
      act(() => {
        result.current.deriveKeypoints(['无效', '也不是有效']);
      });

      expect(result.current.showKeypoints).toBe(false);
    });

    it('empty suggestions array leaves state unchanged', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints([]);
      });

      expect(result.current.keypoints).toEqual([]);
      expect(result.current.showKeypoints).toBe(false);
    });

    it('assigns sequential ids across multiple deriveKeypoints calls', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] 第一次']); // id 0
      });
      expect(result.current.keypoints[0].id).toBe(0);

      act(() => {
        result.current.deriveKeypoints(['[右上] 第二次']); // id 1
      });
      expect(result.current.keypoints).toHaveLength(1); // replaces, not appends
      expect(result.current.keypoints[0].id).toBe(1);
      expect(result.current.keypoints[0].label).toBe('右上');
    });
  });

  describe('handleDismiss', () => {
    it('removes the keypoint with the given id', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] A', '[右上] B', '[右下] C']);
      });
      expect(result.current.keypoints).toHaveLength(3);

      act(() => {
        result.current.handleDismiss(result.current.keypoints[1].id);
      });

      expect(result.current.keypoints).toHaveLength(2);
      expect(result.current.keypoints.find(kp => kp.label === '左上')).toBeTruthy();
      expect(result.current.keypoints.find(kp => kp.label === '右下')).toBeTruthy();
      expect(result.current.keypoints.find(kp => kp.label === '右上')).toBeUndefined();
    });

    it('does nothing when dismissing a non-existent id', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] A', '[右上] B']);
      });

      act(() => {
        result.current.handleDismiss(9999);
      });

      expect(result.current.keypoints).toHaveLength(2);
    });

    it('sets showKeypoints to false when last keypoint is dismissed', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] 唯一']);
      });
      expect(result.current.showKeypoints).toBe(true);

      act(() => {
        result.current.handleDismiss(result.current.keypoints[0].id);
      });

      expect(result.current.showKeypoints).toBe(false);
      expect(result.current.keypoints).toEqual([]);
    });

    it('showKeypoints stays true when some keypoints remain after dismiss', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] A', '[右上] B']);
      });

      act(() => {
        result.current.handleDismiss(result.current.keypoints[0].id);
      });

      expect(result.current.showKeypoints).toBe(true);
    });
  });

  describe('handleDismissAll', () => {
    it('clears all keypoints', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] A', '[右上] B', '[右下] C']);
      });
      expect(result.current.keypoints).toHaveLength(3);

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.keypoints).toEqual([]);
    });

    it('sets showKeypoints to false', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.deriveKeypoints(['[左上] A']);
      });
      expect(result.current.showKeypoints).toBe(true);

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.showKeypoints).toBe(false);
    });

    it('is safe to call when keypoints is already empty', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.handleDismissAll();
      });

      expect(result.current.keypoints).toEqual([]);
      expect(result.current.showKeypoints).toBe(false);
    });
  });

  describe('setShowKeypoints (manual control)', () => {
    it('can manually show keypoints', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.setShowKeypoints(true);
      });

      expect(result.current.showKeypoints).toBe(true);
    });

    it('can manually hide keypoints', () => {
      const { result } = renderHook(() => useKeypoints());

      act(() => {
        result.current.setShowKeypoints(true);
        result.current.setShowKeypoints(false);
      });

      expect(result.current.showKeypoints).toBe(false);
    });
  });

  describe('setKeypoints (direct state)', () => {
    it('can directly set keypoints array', () => {
      const { result } = renderHook(() => useKeypoints());
      const manuallySet: Keypoint[] = [
        { id: 99, label: '测试', position: 'center', instruction: '直接设置' },
      ];

      act(() => {
        result.current.setKeypoints(manuallySet);
      });

      expect(result.current.keypoints).toEqual(manuallySet);
    });

    it('does not auto-show overlay when directly setting non-empty keypoints', () => {
      const { result } = renderHook(() => useKeypoints());
      const manuallySet: Keypoint[] = [
        { id: 99, label: '测试', position: 'center' },
      ];

      act(() => {
        result.current.setKeypoints(manuallySet);
      });

      // setKeypoints is direct state — doesn't trigger visibility auto-show
      expect(result.current.showKeypoints).toBe(false);
      expect(result.current.keypoints).toHaveLength(1);
    });
  });

  describe('onVisibilityChange callback', () => {
    it('fires when deriveKeypoints finds at least one valid keypoint', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.deriveKeypoints(['[左上] 有效']);
      });

      expect(onVisibilityChange).toHaveBeenCalledWith(true);
    });

    it('does NOT fire when deriveKeypoints finds no valid keypoints (visibility stays as-is)', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.deriveKeypoints(['无效']); // no valid keypoints → empty list, no show
      });

      // No callback: visibility was never changed to true, so no false callback
      expect(onVisibilityChange).not.toHaveBeenCalled();
      expect(result.current.showKeypoints).toBe(false);
    });

    it('fires with false when last keypoint is dismissed via handleDismiss', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.deriveKeypoints(['[左上] 唯一']);
      });
      onVisibilityChange.mockClear();

      act(() => {
        result.current.handleDismiss(result.current.keypoints[0].id);
      });

      expect(onVisibilityChange).toHaveBeenCalledWith(false);
    });

    it('fires when handleDismissAll is called', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.deriveKeypoints(['[左上] A']);
      });
      onVisibilityChange.mockClear();

      act(() => {
        result.current.handleDismissAll();
      });

      expect(onVisibilityChange).toHaveBeenCalledWith(false);
    });

    it('fires when setShowKeypoints is called manually', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.setShowKeypoints(true);
      });

      expect(onVisibilityChange).toHaveBeenCalledWith(true);

      act(() => {
        result.current.setShowKeypoints(false);
      });

      expect(onVisibilityChange).toHaveBeenCalledWith(false);
    });

    it('does not fire when setKeypoints is called directly (manual state)', () => {
      const onVisibilityChange = jest.fn();
      const { result } = renderHook(() => useKeypoints({ onVisibilityChange }));

      act(() => {
        result.current.setKeypoints([{ id: 1, label: '测试', position: 'center' }]);
      });

      expect(onVisibilityChange).not.toHaveBeenCalled();
    });
  });
});
