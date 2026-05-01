/**
 * Unit tests for src/hooks/useCaptureOverlay.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useCaptureOverlay } from '../hooks/useCaptureOverlay';

describe('useCaptureOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with all overlay states false and null values', () => {
      const { result } = renderHook(() => useCaptureOverlay());
      expect(result.current.showComparison).toBe(false);
      expect(result.current.showGridModal).toBe(false);
      expect(result.current.showTimerModal).toBe(false);
      expect(result.current.lastCapturedUri).toBe(null);
      expect(result.current.lastCapturedScore).toBe(null);
      expect(result.current.lastCapturedScoreReason).toBe(null);
    });
  });

  describe('showComparison state', () => {
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
  });

  describe('showGridModal state', () => {
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
  });

  describe('showTimerModal state', () => {
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
  });

  describe('lastCapturedUri state', () => {
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
  });

  describe('lastCapturedScore state', () => {
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
  });

  describe('lastCapturedScoreReason state', () => {
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

  describe('multiple state updates in sequence', () => {
    it('handles multiple state updates across all setters', () => {
      const { result } = renderHook(() => useCaptureOverlay());

      // Update all boolean states
      act(() => {
        result.current.setShowComparison(true);
        result.current.setShowGridModal(true);
        result.current.setShowTimerModal(true);
      });
      expect(result.current.showComparison).toBe(true);
      expect(result.current.showGridModal).toBe(true);
      expect(result.current.showTimerModal).toBe(true);

      // Update all captured metadata states
      act(() => {
        result.current.setLastCapturedUri('file:///sequence1.jpg');
        result.current.setLastCapturedScore(90);
        result.current.setLastCapturedScoreReason('First update reason');
      });
      expect(result.current.lastCapturedUri).toBe('file:///sequence1.jpg');
      expect(result.current.lastCapturedScore).toBe(90);
      expect(result.current.lastCapturedScoreReason).toBe('First update reason');

      // Update again with new values
      act(() => {
        result.current.setLastCapturedUri('file:///sequence2.jpg');
        result.current.setLastCapturedScore(75);
        result.current.setLastCapturedScoreReason('Second update reason');
      });
      expect(result.current.lastCapturedUri).toBe('file:///sequence2.jpg');
      expect(result.current.lastCapturedScore).toBe(75);
      expect(result.current.lastCapturedScoreReason).toBe('Second update reason');

      // Toggle boolean states back
      act(() => {
        result.current.setShowComparison(false);
        result.current.setShowGridModal(false);
        result.current.setShowTimerModal(false);
      });
      expect(result.current.showComparison).toBe(false);
      expect(result.current.showGridModal).toBe(false);
      expect(result.current.showTimerModal).toBe(false);
    });

    it('handles interleaved state updates', () => {
      const { result } = renderHook(() => useCaptureOverlay());

      act(() => {
        result.current.setShowComparison(true);
      });
      expect(result.current.showComparison).toBe(true);

      act(() => {
        result.current.setLastCapturedUri('file:///interleave.jpg');
      });
      expect(result.current.lastCapturedUri).toBe('file:///interleave.jpg');

      act(() => {
        result.current.setShowGridModal(true);
      });
      expect(result.current.showGridModal).toBe(true);

      act(() => {
        result.current.setLastCapturedScore(60);
      });
      expect(result.current.lastCapturedScore).toBe(60);

      act(() => {
        result.current.setLastCapturedScoreReason('Interleave reason');
      });
      expect(result.current.lastCapturedScoreReason).toBe('Interleave reason');

      act(() => {
        result.current.setShowTimerModal(true);
      });
      expect(result.current.showTimerModal).toBe(true);
    });
  });
});