import { useState, useCallback } from 'react';
import type { Keypoint, KeypointPosition, GridVariant, CompositionGrade, CompositionScoreResult, ChallengeSession, UseCompositionScoreResult } from '../types';

// Re-export types from centralized types for backward compatibility
export type { CompositionGrade, CompositionBreakdown, CompositionScoreResult, ChallengeSession, UseCompositionScoreResult } from '../types';

// Grid reference lines for each variant
const GRID_LINES: Record<GridVariant, { vertical: number[]; horizontal: number[] }> = {
  thirds:   { vertical: [0.333, 0.667], horizontal: [0.333, 0.667] },
  golden:   { vertical: [0.382, 0.618], horizontal: [0.382, 0.618] },
  diagonal: { vertical: [0.5], horizontal: [0.5] },
  spiral:   { vertical: [0.5], horizontal: [0.5] },
  none:     { vertical: [0.5], horizontal: [0.5] },
};

// Position coordinates for Keypoint positions
const POSITION_COORDS: Record<KeypointPosition, { x: number; y: number }> = {
  'top-left':     { x: 0.33, y: 0.33 },
  'top-right':    { x: 0.67, y: 0.33 },
  'bottom-left':  { x: 0.33, y: 0.67 },
  'bottom-right': { x: 0.67, y: 0.67 },
  'center':       { x: 0.5,  y: 0.5  },
};

function gradeFromScore(score: number): CompositionGrade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function computeAlignment(keypoints: Keypoint[], gridVariant: GridVariant): number {
  if (keypoints.length === 0) return 50; // neutral
  const { vertical: vLines, horizontal: hLines } = GRID_LINES[gridVariant];
  let totalScore = 0;
  for (const kp of keypoints) {
    const coords = POSITION_COORDS[kp.position];
    // Distance to nearest vertical line
    const vDist = Math.min(...vLines.map(vl => Math.abs(coords.x - vl)));
    // Distance to nearest horizontal line
    const hDist = Math.min(...hLines.map(hl => Math.abs(coords.y - hl)));
    // Score contribution: 0 at 0.5 (max deviation), 100 at 0 (perfect alignment)
    const vScore = Math.max(0, 1 - vDist / 0.5) * 100;
    const hScore = Math.max(0, 1 - hDist / 0.5) * 100;
    totalScore += (vScore + hScore) / 2;
  }
  return Math.round(totalScore / keypoints.length);
}

function computeBalance(keypoints: Keypoint[]): number {
  if (keypoints.length === 0) return 50;
  let leftWeight = 0;
  let rightWeight = 0;
  for (const kp of keypoints) {
    const coords = POSITION_COORDS[kp.position];
    const weight = 1;
    if (coords.x <= 0.5) leftWeight += weight;
    else rightWeight += weight;
  }
  const total = leftWeight + rightWeight;
  if (total === 0) return 50;
  const ratio = Math.abs(leftWeight - rightWeight) / total;
  // 0 ratio = perfectly balanced (100), 1 ratio = completely imbalanced (0)
  return Math.round((1 - ratio) * 100);
}

function computeCentrality(keypoints: Keypoint[]): number {
  if (keypoints.length === 0) return 50;
  const centerX = 0.5;
  const centerY = 0.5;
  let totalDist = 0;
  for (const kp of keypoints) {
    const coords = POSITION_COORDS[kp.position];
    const dist = Math.sqrt(Math.pow(coords.x - centerX, 2) + Math.pow(coords.y - centerY, 2));
    // Max possible distance from center is sqrt(0.5^2 + 0.5^2) ≈ 0.707
    totalDist += dist / 0.707;
  }
  const avgDist = totalDist / keypoints.length;
  // avgDist 0 = perfectly centered (100), avgDist 1 = max deviation (0)
  return Math.round(Math.max(0, Math.min(100, (1 - avgDist) * 100)));
}

function computeScore(keypoints: Keypoint[], gridVariant: GridVariant): CompositionScoreResult {
  const alignment = computeAlignment(keypoints, gridVariant);
  const balance = computeBalance(keypoints);
  const centrality = computeCentrality(keypoints);
  // Weighted average: alignment is most important
  const score = Math.round(alignment * 0.5 + balance * 0.2 + centrality * 0.3);
  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: { alignment, balance, centrality },
    grade: gradeFromScore(score),
  };
}

export function useCompositionScore(): UseCompositionScoreResult {
  const [challengeMode, setChallengeMode] = useState(false);
  const [session, setSession] = useState<ChallengeSession>({
    scores: [],
    bestScore: 0,
    cumulative: 0,
    count: 0,
  });

  const computeScoreCallback = useCallback(
    (keypoints: Keypoint[], gridVariant: GridVariant) => {
      return computeScore(keypoints, gridVariant);
    },
    []
  );

  const toggleChallengeMode = useCallback(() => {
    setChallengeMode(prev => !prev);
  }, []);

  const addScore = useCallback((score: number) => {
    if (!challengeMode) return;
    setSession((prev: ChallengeSession) => ({
      scores: [...prev.scores, score],
      bestScore: Math.max(prev.bestScore, score),
      cumulative: prev.cumulative + score,
      count: prev.count + 1,
    }));
  }, [challengeMode]);

  const resetSession = useCallback(() => {
    setSession({ scores: [], bestScore: 0, cumulative: 0, count: 0 });
  }, []);

  return {
    computeScore: computeScoreCallback,
    session,
    challengeMode,
    toggleChallengeMode,
    addScore,
    resetSession,
  };
}
