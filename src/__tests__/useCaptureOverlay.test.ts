import { renderHook, act } from '@testing-library/react-native';
import { useCaptureOverlay } from '../hooks/useCaptureOverlay';

describe('useCaptureOverlay', () => {
  it('starts with all overlay states false and null values', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    expect(result.current.showComparison).toBe(false);
    expect(result.current.showGridModal).toBe(false);
    expect(result.current.showTimerModal).toBe(false);
    expect(result.current.lastCapturedUri).toBe(null);
    expect(result.current.lastCapturedScore).toBe(null);
    expect(result.current.lastCapturedScoreReason).toBe(null);
  });

  it('setShowComparison updates showComparison state', () => {
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

  it('setShowGridModal updates showGridModal state', () => {
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

  it('setShowTimerModal updates showTimerModal state', () => {
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
    expect(result.current.lastCapturedUri).toBe(null);
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
    expect(result.current.lastCapturedScore).toBe(null);
  });

  it('setLastCapturedScoreReason updates lastCapturedScoreReason', () => {
    const { result } = renderHook(() => useCaptureOverlay());
    act(() => {
      result.current.setLastCapturedScoreReason('构图均衡，曝光准确');
    });
    expect(result.current.lastCapturedScoreReason).toBe('构图均衡，曝光准确');
    act(() => {
      result.current.setLastCapturedScoreReason(null);
    });
    expect(result.current.lastCapturedScoreReason).toBe(null);
  });
});
