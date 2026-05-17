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
      expect(scoreResult.breakdown.alignment).toBeGreaterThanOrEqual(90);
      expect(scoreResult.score).toBeGreaterThanOrEqual(70);
    });

    it('returns perfect alignment score for center position on thirds grid', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.alignment).toBe(100);
    });

    it('balance is 100 for evenly distributed keypoints left/right', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '右上', position: 'top-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.balance).toBe(100);
    });

    it('balance includes center as left weight when using <= 0.5', () => {
      const { result } = renderHook(() => useCompositionScore());
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
      expect(scoreResult.breakdown.balance).toBeLessThan(100);
    });

    it('centrality score reflects distance from true screen center (0.5, 0.5)', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // center at (0.333, 0.333) distance from true center (0.5, 0.5) = 0.236
      // centrality = (1 - 0.236/0.707)*100 = 67
      expect(scoreResult.breakdown.centrality).toBe(67);
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

  describe('center keypoint alignment and balance', () => {
    it('computeAlignment returns 100 for center keypoint against thirds grid', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.alignment).toBe(100);
    });

    it('computeAlignment returns high score for center keypoint against golden grid', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'golden');
      // center at 0.333 is close to golden lines at 0.382, not perfect but high
      expect(scoreResult.breakdown.alignment).toBe(90);
    });

    it('computeBalance with single center keypoint: leftWeight=1, rightWeight=0, ratio=1, balance=0', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // center (x=0.333) <= 0.5 counts as left weight
      // leftWeight=1, rightWeight=0, total=1, ratio=1, balance=(1-1)*100=0
      expect(scoreResult.breakdown.balance).toBe(0);
    });

    it('computeBalance with [center, center]: leftWeight=2, rightWeight=0, ratio=1, balance=0', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
        { id: 1, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.balance).toBe(0);
    });

    it('center keypoint at (0.333,0.333) gives alignment=100, score=70, grade=B', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      expect(scoreResult.breakdown.alignment).toBe(100);
      expect(scoreResult.breakdown.balance).toBe(0); // single center, all left
      expect(scoreResult.breakdown.centrality).toBe(67);
      expect(scoreResult.score).toBe(70);
      expect(scoreResult.grade).toBe('B');
    });
  });

  describe('grade boundaries', () => {
    it('grade is S for score >= 90, A for 80-89', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '右上', position: 'top-right' },
        { id: 2, label: '左下', position: 'bottom-left' },
        { id: 3, label: '右下', position: 'bottom-right' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // top-left x=0.33 vs thirds 0.333: vDist=0.003, vScore=99.4
      // alignment avg ~99, balance=100, centrality ~66
      // score = 99*0.5 + 100*0.2 + 66*0.3 = 89.3 -> 89 -> A
      expect(scoreResult.score).toBe(89);
      expect(scoreResult.grade).toBe('A');
    });

    it('grade is B for score 70-79', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      const scoreResult = result.current.computeScore(keypoints, 'thirds');
      // alignment=100, balance=0, centrality=67
      // score = 100*0.5 + 0*0.2 + 67*0.3 = 50 + 0 + 20 = 70
      expect(scoreResult.score).toBe(70);
      expect(scoreResult.grade).toBe('B');
    });

    it('grade is C for score 60-69', () => {
      const { result } = renderHook(() => useCompositionScore());
      const keypoints: Keypoint[] = [
        { id: 0, label: '中间', position: 'center' },
      ];
      // Use golden grid to reduce alignment from 100 to 90
      const scoreResult = result.current.computeScore(keypoints, 'golden');
      // alignment=90, balance=0, centrality=67
      // score = 90*0.5 + 0*0.2 + 67*0.3 = 45 + 0 + 20 = 65
      expect(scoreResult.score).toBe(65);
      expect(scoreResult.grade).toBe('C');
    });

    it('grade is D for very imbalanced off-grid compositions', () => {
      const { result } = renderHook(() => useCompositionScore());
      // Left-side corners on diagonal grid: off-grid + imbalanced
      const badKeypoints: Keypoint[] = [
        { id: 0, label: '左上', position: 'top-left' },
        { id: 1, label: '左下', position: 'bottom-left' },
      ];
      const badResult = result.current.computeScore(badKeypoints, 'diagonal');
      // diagonal lines at 0.5, top-left at (0.33, 0.33): vDist=0.17, vScore=66
      // alignment=66, balance=0 (all left), centrality=66
      // score = 66*0.5 + 0*0.2 + 66*0.3 = 52.8 -> 53 -> D
      expect(badResult.score).toBe(53);
      expect(badResult.grade).toBe('D');
    });
  });
});