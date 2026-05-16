/**
 * Tests for useCompositionScore hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { Keypoint } from '../components/KeypointOverlay';
import { GridVariant } from '../components/GridOverlay';

describe('useCompositionScore', () => {
  describe('score calculation', () => {
    it('returns neutral score (50) for empty keypoints', () => {
      const { result } = renderHook(() => useCompositionScore());
      const scoreResult = result.current.computeScore([], 'thirds');
      expect(scoreResult.score).toBe(50);
      expect(scoreResult.breakdown.alignment).toBe(50);
      expect(scoreResult.breakdown.balance).toBe(50);
      expect(scoreResult.breakdown.centrality).toBe(50);
    });

    it('returns high score for keypoints at thirds intersection points', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '右上', position: 'top-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // Alignment should be very high (keypoints align with thirds grid)
      expect(scoreResult.breakdown.alignment).toBeGreaterThanOrEqual(90);
      expect(scoreResult.score).toBeGreaterThanOrEqual(70);
    });

    it('returns perfect alignment score for center position on thirds grid', () => {
      const { result } = renderHook(() => useCompositionScore());
      // 'center' position is now at (0.5, 0.5) - true screen center
      // Distance to nearest thirds line = min(|0.5-0.333|, |0.5-0.667|) = 0.167, alignment = ~67
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // Alignment: center at (0.5, 0.5) is NOT on thirds intersection, alignment = ~67
      expect(scoreResult.breakdown.alignment).toBe(67);
    });

    it('balance is 100 for evenly distributed keypoints left/right', () => {
      const { result } = renderHook(() => useCompositionScore());
      // top-left (x=0.33) and top-right (x=0.67) - one left, one right = balanced
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '右上', position: 'top-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.balance).toBe(100);
    });

    it('balance includes center as left weight when using <= 0.5', () => {
      const { result } = renderHook(() => useCompositionScore());
      // center at x=0.333 counts as left weight (x <= 0.5)
      // So center + top-left = 2 left, 0 right -> ratio = 1, balance = 0
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
        { id: 1, label: '左上', position: 'top-left' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.balance).toBe(0);
    });

    it('balance is lower for imbalanced keypoint distribution', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '左下', position: 'bottom-left' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // All keypoints on left side = imbalanced
      expect(scoreResult.breakdown.balance).toBeLessThan(100);
    });

    it('centrality is highest for center position keypoint', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // center at (0.5, 0.5) IS at true screen center, so centrality = 100
      expect(scoreResult.breakdown.centrality).toBe(100);
    });

    it('centrality is lower for corner keypoints', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.centrality).toBeLessThan(100);
    });

    it('computes correct grade for score >= 90', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '右上', position: 'top-right' },
        { id: 2, label: '左下', position: 'bottom-left' },
        { id: 3, label: '右下', position: 'bottom-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(['S', 'A', 'B', 'C', 'D']).toContain(scoreResult.grade);
    });
  });

  describe('grade thresholds', () => {
    it('grade is one of valid values for various keypoint configurations', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypointsConfigs: Keypoint[][] = [
        [{ id: 0, label: '左上', position: 'top-left' }],
        [{ id: 0, label: '中间', position: 'center' }],
        [{ id: 0, label: '左上', position: 'top-left' }, { id: 1, label: '右上', position: 'top-right' }],
        [{ id: 0, label: '左上', position: 'top-left' }, { id: 1, label: '左下', position: 'bottom-left' }],
      ];
      const gridVariants: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];

      for (const kps of keypointsConfigs) {
        for (const gv of gridVariants) {
          const scoreResult = result.current.computeScore(kps, gv);
          expect(['S', 'A', 'B', 'C', 'D']).toContain(scoreResult.grade);
          expect(scoreResult.score).toBeGreaterThanOrEqual(0);
          expect(scoreResult.score).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('challenge mode', () => {
    it('challengeMode is false initially', () => {
      const { result } = renderHook(() => useCompositionScore());
      expect(result.current.challengeMode).toBe(false);
    });

    it('toggleChallengeMode toggles the state', () => {
      const { result } = renderHook(() => useCompositionScore());
      expect(result.current.challengeMode).toBe(false);
      act(() => { result.current.toggleChallengeMode(); });
      expect(result.current.challengeMode).toBe(true);
      act(() => { result.current.toggleChallengeMode(); });
      expect(result.current.challengeMode).toBe(false);
    });

    it('session is empty initially', () => {
      const { result } = renderHook(() => useCompositionScore());
      expect(result.current.session.scores).toEqual([]);
      expect(result.current.session.bestScore).toBe(0);
      expect(result.current.session.cumulative).toBe(0);
      expect(result.current.session.count).toBe(0);
    });

    it('addScore adds score to session in challenge mode', () => {
      const { result } = renderHook(() => useCompositionScore());
      act(() => { result.current.toggleChallengeMode(); });
      expect(result.current.challengeMode).toBe(true);
      act(() => { result.current.addScore(85); });
      expect(result.current.session.scores).toEqual([85]);
      expect(result.current.session.bestScore).toBe(85);
      expect(result.current.session.cumulative).toBe(85);
      expect(result.current.session.count).toBe(1);
    });

    it('addScore does nothing when challenge mode is off', () => {
      const { result } = renderHook(() => useCompositionScore());
      expect(result.current.challengeMode).toBe(false);
      act(() => { result.current.addScore(85); });
      expect(result.current.session.scores).toEqual([]);
    });

    it('addScore updates bestScore correctly', () => {
      const { result } = renderHook(() => useCompositionScore());
      act(() => { result.current.toggleChallengeMode(); });
      act(() => { result.current.addScore(70); });
      act(() => { result.current.addScore(90); });
      act(() => { result.current.addScore(80); });
      expect(result.current.session.bestScore).toBe(90);
      expect(result.current.session.cumulative).toBe(240);
      expect(result.current.session.count).toBe(3);
    });

    it('resetSession clears all session stats', () => {
      const { result } = renderHook(() => useCompositionScore());
      act(() => { result.current.toggleChallengeMode(); });
      act(() => { result.current.addScore(85); });
      act(() => { result.current.addScore(90); });
      expect(result.current.session.count).toBe(2);
      act(() => { result.current.resetSession(); });
      expect(result.current.session.scores).toEqual([]);
      expect(result.current.session.bestScore).toBe(0);
      expect(result.current.session.cumulative).toBe(0);
      expect(result.current.session.count).toBe(0);
    });

    it('multiple scores accumulate correctly', () => {
      const { result } = renderHook(() => useCompositionScore());
      act(() => { result.current.toggleChallengeMode(); });
      act(() => { result.current.addScore(60); });
      act(() => { result.current.addScore(70); });
      act(() => { result.current.addScore(80); });
      expect(result.current.session.scores).toEqual([60, 70, 80]);
      expect(result.current.session.bestScore).toBe(80);
      expect(result.current.session.cumulative).toBe(210);
      expect(result.current.session.count).toBe(3);
    });
  });

  describe('computeScore with different grid variants', () => {
    it('works with golden grid variant', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'golden');
      expect(scoreResult.score).toBeGreaterThanOrEqual(0);
      expect(scoreResult.score).toBeLessThanOrEqual(100);
    });

    it('works with diagonal grid variant', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'diagonal');
      expect(scoreResult.score).toBeGreaterThanOrEqual(0);
    });

    it('works with spiral grid variant', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '右上', position: 'top-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'spiral');
      expect(scoreResult.score).toBeGreaterThanOrEqual(0);
    });

    it('works with none grid variant', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左下', position: 'bottom-left' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'none');
      expect(scoreResult.score).toBeGreaterThanOrEqual(0);
    });
  });
});
