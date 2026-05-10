import { renderHook, act } from '@testing-library/react-native';
import { useCaptureOverlay } from '../useCaptureOverlay';

describe('useCaptureOverlay', () => {
  it('returns all required state and setters', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    expect(result.current).toHaveProperty('showComparison');
    expect(result.current).toHaveProperty('setShowComparison');
    expect(result.current).toHaveProperty('showGridModal');
    expect(result.current).toHaveProperty('setShowGridModal');
    expect(result.current).toHaveProperty('showTimerModal');
    expect(result.current).toHaveProperty('setShowTimerModal');
    expect(result.current).toHaveProperty('lastCapturedUri');
    expect(result.current).toHaveProperty('setLastCapturedUri');
    expect(result.current).toHaveProperty('lastCapturedScore');
    expect(result.current).toHaveProperty('setLastCapturedScore');
    expect(result.current).toHaveProperty('lastCapturedScoreReason');
    expect(result.current).toHaveProperty('setLastCapturedScoreReason');
  });

  it('initializes all booleans to false', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    expect(result.current.showComparison).toBe(false);
    expect(result.current.showGridModal).toBe(false);
    expect(result.current.showTimerModal).toBe(false);
  });

  it('initializes lastCaptured* to null', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    expect(result.current.lastCapturedUri).toBeNull();
    expect(result.current.lastCapturedScore).toBeNull();
    expect(result.current.lastCapturedScoreReason).toBeNull();
  });

  it('setShowComparison updates showComparison', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setShowComparison(true);
    });
    expect(result.current.showComparison).toBe(true);
    act(() => {
      result.current.setShowComparison(false);
    });
    expect(result.current.showComparison).toBe(false);
  });

  it('setShowGridModal updates showGridModal', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setShowGridModal(true);
    });
    expect(result.current.showGridModal).toBe(true);
    act(() => {
      result.current.setShowGridModal(false);
    });
    expect(result.current.showGridModal).toBe(false);
  });

  it('setShowTimerModal updates showTimerModal', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setShowTimerModal(true);
    });
    expect(result.current.showTimerModal).toBe(true);
    act(() => {
      result.current.setShowTimerModal(false);
    });
    expect(result.current.showTimerModal).toBe(false);
  });

  it('setLastCapturedUri updates lastCapturedUri', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setLastCapturedUri('file:///photo.jpg');
    });
    expect(result.current.lastCapturedUri).toBe('file:///photo.jpg');
    act(() => {
      result.current.setLastCapturedUri(null);
    });
    expect(result.current.lastCapturedUri).toBeNull();
  });

  it('setLastCapturedScore updates lastCapturedScore', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setLastCapturedScore(85);
    });
    expect(result.current.lastCapturedScore).toBe(85);
    act(() => {
      result.current.setLastCapturedScore(null);
    });
    expect(result.current.lastCapturedScore).toBeNull();
  });

  it('setLastCapturedScoreReason updates lastCapturedScoreReason', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setLastCapturedScoreReason('三分法对齐良好');
    });
    expect(result.current.lastCapturedScoreReason).toBe('三分法对齐良好');
    act(() => {
      result.current.setLastCapturedScoreReason(null);
    });
    expect(result.current.lastCapturedScoreReason).toBeNull();
  });

  it('multiple setters can be updated independently', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setShowComparison(true);
      result.current.setLastCapturedUri('file:///img.png');
      result.current.setLastCapturedScore(90);
      result.current.setLastCapturedScoreReason('构图优秀');
    });
    expect(result.current.showComparison).toBe(true);
    expect(result.current.lastCapturedUri).toBe('file:///img.png');
    expect(result.current.lastCapturedScore).toBe(90);
    expect(result.current.lastCapturedScoreReason).toBe('构图优秀');
  });
});