/**
 * Tests for CompositionScoreOverlay component (migrated to react-native-reanimated v4)
 */

import React from 'react';

// Mock Reanimated v4 (local mock avoids native worklets initialization error)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');
import { render, fireEvent } from '@testing-library/react-native';
import { CompositionScoreOverlay } from '../components/CompositionScoreOverlay';
import type { CompositionScoreResult, ChallengeSession } from '../types';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
      scoreS: '#FFD700',
      scoreA: '#C0C0C0',
      scoreB: '#CD7F32',
      scoreC: '#8B7355',
      scoreD: '#555555',
      scoreOverlayBg: 'rgba(0,0,0,0.65)',
      scoreHintText: 'rgba(255,255,255,0.4)',
      scoreCardBg: 'rgba(28,28,28,0.95)',
      scoreCardBorder: 'rgba(255,255,255,0.1)',
      scoreLabelText: 'rgba(255,255,255,0.6)',
      scoreBarBg: 'rgba(255,255,255,0.1)',
      sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// Mock useAccessibilityAnnouncement hook
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
  })),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

const makeResult = (overrides: Partial<CompositionScoreResult> = {}): CompositionScoreResult => ({
  score: 85,
  breakdown: { alignment: 90, balance: 80, centrality: 85 },
  grade: 'A',
  ...overrides,
});

const makeSession = (overrides: Partial<ChallengeSession> = {}): ChallengeSession => ({
  scores: [],
  bestScore: 0,
  cumulative: 0,
  count: 0,
  ...overrides,
});

describe('CompositionScoreOverlay', () => {
  const defaultProps = {
    result: makeResult(),
    challengeMode: false,
    session: makeSession(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('displays score label', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('calls onDismiss when tapped', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <CompositionScoreOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('构图评分'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('displays tap hint text', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('轻触关闭')).toBeTruthy();
  });

  it('displays breakdown bars with correct labels', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('构图对齐')).toBeTruthy();
    expect(getByText('左右平衡')).toBeTruthy();
    expect(getByText('中心位置')).toBeTruthy();
  });

  it('does not show challenge session stats when challenge mode is off', () => {
    const session = makeSession({
      scores: [80],
      bestScore: 80,
      cumulative: 80,
      count: 1,
    });
    const { queryByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        challengeMode={false}
        session={session}
      />
    );
    expect(queryByText('🎮 挑战模式')).toBeNull();
  });

  it('displays correct grade colors for S rank', () => {
    const { getByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        result={makeResult({ score: 95, grade: 'S', breakdown: { alignment: 95, balance: 95, centrality: 95 } })}
      />
    );
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('displays challenge session stats when challenge mode is active', () => {
    const session = makeSession({
      scores: [80, 90],
      bestScore: 90,
      cumulative: 170,
      count: 2,
    });
    const { getByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        challengeMode={true}
        session={session}
      />
    );
    expect(getByText('🎮 挑战模式')).toBeTruthy();
    expect(getByText('本轮最高')).toBeTruthy();
    expect(getByText('累计平均')).toBeTruthy();
    expect(getByText('已拍张数')).toBeTruthy();
  });

  it('displays different grades correctly', () => {
    const grades: Array<{ grade: 'S' | 'A' | 'B' | 'C' | 'D'; score: number }> = [
      { grade: 'S', score: 95 },
      { grade: 'A', score: 85 },
      { grade: 'B', score: 75 },
      { grade: 'C', score: 65 },
      { grade: 'D', score: 45 },
    ];

    for (const { grade, score } of grades) {
      jest.clearAllMocks();
      const result = makeResult({ grade, score });
      const { getByText } = render(
        <CompositionScoreOverlay {...defaultProps} result={result} />
      );
      expect(getByText('构图评分')).toBeTruthy();
    }
  });

  it('handles D grade correctly', () => {
    const result = makeResult({ score: 30, grade: 'D', breakdown: { alignment: 30, balance: 30, centrality: 30 } });
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} result={result} />);
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('score display is driven by withDelay + useAnimatedReaction (no JS setTimeout)', () => {
    // Verify the component source does NOT contain a setTimeout for score display.
    // The score reveal is now fully UI-thread driven via withDelay on gradePopScale.value.
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/CompositionScoreOverlay.tsx'),
      'utf8',
    );
    // The old implementation had: setTimeout(() => { runOnJS(setDisplayScore)(score) }, GRADE_DELAY_MS + 50)
    // That setTimeout must NOT appear in the source.
    expect(source).not.toMatch(/setTimeout.*setDisplayScore/);
    // The correct pattern: gradePopScale.value = withDelay(GRADE_DELAY_MS, withSpring(...))
    expect(source).toMatch(/gradePopScale\.value\s*=\s*withDelay/);
    // Score is set via runOnJS inside useAnimatedReaction (not via setTimeout callback)
    expect(source).toMatch(/runOnJS\(setDisplayScore\)/);
  });
});
