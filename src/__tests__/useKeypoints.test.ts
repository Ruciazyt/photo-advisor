import { renderHook, act } from '@testing-library/react-native';
import { useKeypoints, parseKeypointFromText } from '../hooks/useKeypoints';

// --- parseKeypointFromText unit tests ---

describe('parseKeypointFromText', () => {
  it('parses bracketed label and instruction', () => {
    const result = parseKeypointFromText('[左上] 将主体放在左上区域', 0);
    expect(result).toEqual({
      id: 0,
      label: '左上',
      position: 'top-left',
      instruction: '将主体放在左上区域',
    });
  });

  it('parses top-right label', () => {
    const result = parseKeypointFromText('[右上] 人物面部在这里', 1);
    expect(result).toEqual({
      id: 1,
      label: '右上',
      position: 'top-right',
      instruction: '人物面部在这里',
    });
  });

  it('parses bottom-left label', () => {
    const result = parseKeypointFromText('[左下] 填充前景', 2);
    expect(result).toEqual({
      id: 2,
      label: '左下',
      position: 'bottom-left',
      instruction: '填充前景',
    });
  });

  it('parses bottom-right label', () => {
    const result = parseKeypointFromText('[右下] 重要区域', 3);
    expect(result).toEqual({
      id: 3,
      label: '右下',
      position: 'bottom-right',
      instruction: '重要区域',
    });
  });

  it('parses center label', () => {
    const result = parseKeypointFromText('[中间] 主体位于中心', 4);
    expect(result).toEqual({
      id: 4,
      label: '中间',
      position: 'center',
      instruction: '主体位于中心',
    });
  });

  it('returns null for plain text without bracket', () => {
    const result = parseKeypointFromText('这是一条普通建议', 0);
    expect(result).toBeNull();
  });

  it('returns null for empty text', () => {
    const result = parseKeypointFromText('', 0);
    expect(result).toBeNull();
  });

  it('handles instruction-only (no extra content after label)', () => {
    const result = parseKeypointFromText('[左上]', 0);
    expect(result).toEqual({
      id: 0,
      label: '左上',
      position: 'top-left',
      instruction: undefined,
    });
  });
});

// --- useKeypoints hook tests ---

describe('useKeypoints', () => {
  it('starts with empty keypoints and hidden', () => {
    const { result } = renderHook(() => useKeypoints());
    expect(result.current.keypoints).toEqual([]);
    expect(result.current.showKeypoints).toBe(false);
  });

  it('setKeypoints updates keypoints list', () => {
    const { result } = renderHook(() => useKeypoints());
    const kps = [
      { id: 0, label: '左上', position: 'top-left' as const, instruction: 'test' },
    ];
    act(() => {
      result.current.setKeypoints(kps);
    });
    expect(result.current.keypoints).toEqual(kps);
  });

  it('setShowKeypoints updates visibility', () => {
    const { result } = renderHook(() => useKeypoints());
    act(() => {
      result.current.setShowKeypoints(true);
    });
    expect(result.current.showKeypoints).toBe(true);
    act(() => {
      result.current.setShowKeypoints(false);
    });
    expect(result.current.showKeypoints).toBe(false);
  });

  it('setShowKeypoints calls onVisibilityChange callback', () => {
    const cb = jest.fn();
    const { result } = renderHook(() => useKeypoints({ onVisibilityChange: cb }));
    act(() => {
      result.current.setShowKeypoints(true);
    });
    expect(cb).toHaveBeenCalledWith(true);
    cb.mockClear();
    act(() => {
      result.current.setShowKeypoints(false);
    });
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('deriveKeypoints parses suggestion strings into keypoints', () => {
    const { result } = renderHook(() => useKeypoints());
    act(() => {
      result.current.deriveKeypoints([
        '[左上] 将主体放在左上',
        '[右下] 放在右下',
        '普通建议', // should be skipped
      ]);
    });
    expect(result.current.keypoints).toHaveLength(2);
    expect(result.current.keypoints[0]).toMatchObject({
      label: '左上',
      position: 'top-left',
      instruction: '将主体放在左上',
    });
    expect(result.current.keypoints[1]).toMatchObject({
      label: '右下',
      position: 'bottom-right',
      instruction: '放在右下',
    });
  });

  it('deriveKeypoints sets showKeypoints to true when items exist', () => {
    const { result } = renderHook(() => useKeypoints());
    expect(result.current.showKeypoints).toBe(false);
    act(() => {
      result.current.deriveKeypoints(['[左上] test']);
    });
    expect(result.current.showKeypoints).toBe(true);
  });

  it('handleDismiss removes a specific keypoint by id', () => {
    const { result } = renderHook(() => useKeypoints());
    act(() => {
      result.current.setKeypoints([
        { id: 0, label: '左上', position: 'top-left' as const },
        { id: 1, label: '右上', position: 'top-right' as const },
      ]);
    });
    expect(result.current.keypoints).toHaveLength(2);
    act(() => {
      result.current.handleDismiss(0);
    });
    expect(result.current.keypoints).toHaveLength(1);
    expect(result.current.keypoints[0].id).toBe(1);
  });

  it('handleDismiss hides keypoints when last one is removed', () => {
    const { result } = renderHook(() => useKeypoints());
    act(() => {
      result.current.setKeypoints([{ id: 0, label: '左上', position: 'top-left' as const }]);
      result.current.setShowKeypoints(true);
    });
    act(() => {
      result.current.handleDismiss(0);
    });
    expect(result.current.showKeypoints).toBe(false);
  });

  it('handleDismissAll clears all keypoints and hides', () => {
    const { result } = renderHook(() => useKeypoints());
    act(() => {
      result.current.setKeypoints([
        { id: 0, label: '左上', position: 'top-left' as const },
        { id: 1, label: '右上', position: 'top-right' as const },
      ]);
      result.current.setShowKeypoints(true);
    });
    act(() => {
      result.current.handleDismissAll();
    });
    expect(result.current.keypoints).toEqual([]);
    expect(result.current.showKeypoints).toBe(false);
  });
});
